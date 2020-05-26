/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Readable, pipeline, Writable } from 'stream';

export const readStreamToCompletion = <T = any>(stream: Readable) => {
  return new Promise<T[]>((resolve, reject) => {
    const chunks: T[] = [];
    pipeline(
      stream,
      new Writable({
        objectMode: true,
        write(chunk, enc, done) {
          chunks.push(chunk);
          done();
        },
      }),
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(chunks);
        }
      }
    );
  });
};
