/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import Boom from 'boom';
import fs from 'fs';
import os from 'os';
const util = require('util');
// const readFile = util.promisify(fs.readFile);
const readdir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);

export function fileDataVisualizerProvider(callWithRequest) {
  async function analyzeFile(data, overrides) {
    let cached = false;
    let results = [];
    const hasOverrides = false;

    try {
      results = await callWithRequest('ml.fileStructure', { body: data, ...overrides });
      cached = await cacheData(data);
    } catch (error) {
      const err = (error.message !== undefined) ? error.message : error;
      throw Boom.badRequest(err);
    }
    return {
      hasOverrides,
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

  function createOutputDir(dir) {
    if (fs.existsSync(dir) === false) {
      fs.mkdirSync(dir);
    }
  }

  async function deleteOutputFiles(outputPath) {
    const files = await readdir(outputPath);
    files.forEach((f) => {
      fs.unlinkSync(`${outputPath}/${f}`);
    });
  }

  return {
    analyzeFile
  };
}
