/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import path from 'path';
import yauzl from 'yauzl';
import mkdirp from 'mkdirp';

function decompressZip(input: string, output: string) {
  mkdirp.sync(output);
  return new Promise((resolve, reject) => {
    yauzl.open(input, { lazyEntries: true }, (errOpenArchive, zipfile) => {
      if (errOpenArchive) return reject(errOpenArchive);
      if (zipfile === undefined) return reject(new Error('no zipfile'));

      zipfile.readEntry();

      zipfile.on('close', resolve);

      zipfile.on('error', reject);

      zipfile.on('entry', entry => {
        const zipPath = entry.fileName
          .split(/\/|\\/)
          .slice(1)
          .join(path.sep);
        const fileName = path.resolve(output, zipPath);

        if (/\/$/.test(entry.fileName)) {
          mkdirp.sync(fileName);
          zipfile.readEntry();
        } else {
          // file entry
          zipfile.openReadStream(entry, (errOpenReadStream, readStream) => {
            if (errOpenReadStream) return reject(errOpenReadStream);
            if (readStream === undefined) return reject(new Error('no readStream'));
            readStream.on('end', () => {
              zipfile.readEntry();
            });

            readStream.pipe(fs.createWriteStream(fileName));
          });
        }
      });
    });
  });
}

export async function decompress(input: string, output: string) {
  const ext = path.extname(input);

  switch (path.extname(input)) {
    case '.zip':
      await decompressZip(input, output);
      break;
    default:
      throw new Error(`unknown extension "${ext}"`);
  }
}
