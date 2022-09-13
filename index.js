const fs = require('fs')
const path = require('path')
const tar = require('tar')

function cleanFile(pathStr) {
  if (fs.existsSync(pathStr)) {
    const stat = fs.statSync(pathStr)
    if (stat.isDirectory()) {
      fs.rmSync(pathStr, { recursive: true })
    } else if (stat.isFile()) {
      fs.unlinkSync(pathStr)
    }
  }
}
function cleanPrepareDir(pathStr) {
  cleanFile(pathStr)
  fs.mkdirSync(pathStr)
}
function copyFile(sourcePath, targetPath) {
  // fs.copyFileSync(sourcePath, targetPath)
  return new Promise((resolve, reject) => {
    fs.copyFile(sourcePath, targetPath, resolve)
    console.log(`copy ${sourcePath} to ${targetPath} successed.`)
  })
}
function mkdir(pathStr) {
  if (!fs.existsSync(pathStr)) {
    fs.mkdirSync(pathStr)
  }
  return pathStr
}

// 根目录只能是当前执行的盘符 此处 / = D:
let today = new Date().toISOString().split(/T/)[0].replace(/-/g, '')
const packagePath = `F:/test/front-end-${today}`
cleanPrepareDir(packagePath)

let path1 = 'F:/program/dist'
let path2 = 'F:/program/H5'
let path3 = 'F:/program/Wxmini'
const archiveMap = {
  copy() {
    return copyFile('./readme.md', `${packagePath}/readme.md`)
  },
  p1() {
    return new Promise((resolve, reject) => {
      tar
        .c(
          {
            gzip: true,
            cwd: path1, // tar 中的 -C 参数，用来指定压缩的目录
          },
          ['.']
        )
        .pipe(fs.createWriteStream(`${packagePath}/dist.tar.gz`))
        .on('finish', resolve)
    })
  },
  p2() {
    return new Promise((resolve, reject) => {
      tar
        .c(
          {
            gzip: true,
            cwd: path2,
            filter(path, stat) {
              const ignoreFiles = ['.git', '.vscode', '^.env*', '^./scss']
              for (let i = 0; i < ignoreFiles.length; i++) {
                const reg = new RegExp(ignoreFiles[i], 'g')
                if (reg.test(path)) {
                  console.log(reg)
                  console.log('ignore', path)
                  return false
                }
              }
              return true
            },
          },
          ['.']
        )
        .pipe(fs.createWriteStream(`${packagePath}/H5.tar.gz`))
        .on('finish', resolve)
    })
  },
  p3() {
    return new Promise((resolve, reject) => {
      tar
        .c(
          {
            gzip: true,
            cwd: path3,
            filter(path, stat) {
              const ignoreFiles = [
                '.git',
                '.vscode',
                '^.env*',
                '.husky',
                '^./node_modules', // 排除根目录下的 node_modules, 但是不排除其他 node_modules, eg: src/node_modules
                '^./dist', // 排除根目录下的 dist，但是不排除其他目录的 dist eg: src/node_modules/@vant/dist
              ]
              for (let i = 0; i < ignoreFiles.length; i++) {
                let reg = new RegExp(ignoreFiles[i], 'g')
                if (reg.test(path)) {
                  console.log(reg)
                  console.log('ignore file', path)
                  return false
                }
              }
              return true
            },
          },
          ['.']
        )
        .pipe(fs.createWriteStream(`${packagePath}/Wxmini.tar.gz`))
        .on('finish', () => {
          resolve()
        })
    })
  },
  all() {
    return new Promise((resolve, reject) => {
      tar.c({
        gzip: true,
        cwd: packagePath
      }, 
        ['.']
      ).pipe(fs.createWriteStream(`${packagePath}.tar.gz`))
      .on('finish', () => {
        resolve()
      })
    })
  }
}
const flags = {
  copy: { archive: true}, // 说明文件
  p1: { archive: true }, //  运营后台
  p2: { archive: false }, // 静态资源
  p3: { archive: false }, // 小程序
  all: { merge: false}, // 合并打包
}
let packageList = []


Object.keys(flags).forEach((item) => {
  if (flags[item].archive) {
    packageList.push(archiveMap[item]())
  }
})


Promise.all(packageList)
  .then(() => {
    if(flags.all.merge) {
      archiveMap.all()
    }
    console.log('打包完成')
  })
  .catch((err) => {
    console.error('打包出错：', err)
    throw err
  })