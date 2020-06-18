/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import path, { join, resolve } from 'path';

export const getPrepackagedTimelines = async (
  dir = resolve(join(__dirname, './prepackaged_timelines')),
  fileName = 'index.ndjson'
) => {
  const dataPath = path.join(dir, fileName);
  console.log('dataPath', dataPath);
  try {
    // return new Promise((resolved, reject) => {
    //   let contents = null;
    //   const readable = fs.createReadStream(dataPath, { encoding: 'utf-8' });

    //   readable.on('data', (stream) => {
    //     // console.log('data', stream);
    //     contents += stream;
    //   });

    //   readable.on('end', () => {
    //     console.log('end');
    //     resolved(contents);
    //   });

    //   readable.on('open', () => {
    //     console.log('Stream opened...');
    //     // set('hapi.filename', 'prepackage_timelines.ndjson', readable);
    //   });
    // });
    return fs.readFileSync(dataPath, { encoding: 'utf-8' });
  } catch (err) {
    // TODO: error handling
    console.log(`file not found: ${dataPath}: ${err.message}`);
  }
};
