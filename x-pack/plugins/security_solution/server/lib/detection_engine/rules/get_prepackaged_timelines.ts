/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import path, { join, resolve } from 'path';
import { Readable } from 'stream';
import { createListStream } from '../../../../../../../src/legacy/utils';

export const getPrepackagedTimelines = async (
  dir = resolve(join(__dirname, './prepackaged_timelines')),
  fileName = 'index.ndjson'
): Promise<Readable> => {
  const dataPath = path.join(dir, fileName);

  return new Promise((resolved, reject) => {
    const contents: Buffer[] = [];
    const readable = fs.createReadStream(dataPath);

    readable.on('data', (stream) => {
      contents.push(stream);
    });

    readable.on('end', () => {
      const streams = createListStream(contents);
      resolved(streams);
    });

    readable.on('error', (err) => {
      reject(err);
    });
  });
};
