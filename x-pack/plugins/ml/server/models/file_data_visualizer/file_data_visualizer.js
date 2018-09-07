/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import fs from 'fs';
import os from 'os';
const util = require('util');
// const readFile = util.promisify(fs.readFile);
const readdir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);

export function fileDataVisualizerProvider(callWithRequest) {
  async function analyseFile(data) {
    const cached = await cacheData(data);
    const results = await callWithRequest('ml.fileStructure');
    return {
      cached,
      results,
    };
  }

  async function cacheData(data) {
    const outputPath = `${os.tmpdir()}/kibana-ml`;
    const tempFile = 'es-ml-tempFile';
    const tempFilePath = `${outputPath}/${tempFile}`;

    try {
      createOutputDir(outputPath);
      await deleteOutputFiles(outputPath);
      await writeFile(tempFilePath, data);
      return true;
    } catch (error) {
      return false;
    }
  }

  // async function cacheData2(data) {
  //   return new Promise(async (resolve, reject) => {
  //     const lccPath = `${__dirname}/../../../../lcc`;
  //     const outputPath = `${os.tmpdir()}/elasticsearch.ML`;
  //     const tempFile = 'es-ml-tempFile';
  //     const tempFilePath = `${outputPath}/${tempFile}`;

  //     createOutputDir(outputPath);
  //     await deleteOutputFiles(outputPath);
  //     await writeFile(tempFilePath, logData.body);
  //     const lccProcess = spawn(`${lccPath}/bin/log-config-creator`, [`-n${tempFile}`, `-o${outputPath}`, tempFilePath]);

  //     lccProcess.on('close', () => {
  //       readAllResultsFiles(outputPath, tempFilePath)
  //         .then((content) => {
  //           const results = {};
  //           outputFiles.forEach((f, i) => results[f.id] = content[i]);
  //           resolve(results);
  //         })
  //         .catch((err) => {
  //           reject(err);
  //         });
  //     });

  //     lccProcess.stderr.on('data', (data) => {
  //       console.error(data);
  //       // reject(data);
  //     });

  //   });
  // }

  // async function readAllResultsFiles(outputPath, tempFilePath) {
  //   return Promise.all(outputFiles.map(async f => await loadFile(`${tempFilePath}${f.name}`)));
  // }

  // async function loadFile(fileName) {
  //   const exists = fs.existsSync(fileName);
  //   return (exists) ? await readFile(fileName, 'utf-8') : undefined;
  // }

  function createOutputDir(dir) {
    if (fs.existsSync(dir) === false) {
      fs.mkdirSync(dir);
    }
  }

  async function deleteOutputFiles(outputPath) {
    const files = await listDirs(outputPath);
    files.forEach((f) => {
      fs.unlinkSync(`${outputPath}/${f}`);
    });
  }

  async function listDirs(dirName) {
    const dirs = [];
    return new Promise((resolve, reject) => {
      readdir(dirName)
        .then((fileNames) => {
          fileNames.forEach((fileName) => {
            dirs.push(fileName);
          });
          resolve(dirs);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  return {
    analyseFile
  };
}
