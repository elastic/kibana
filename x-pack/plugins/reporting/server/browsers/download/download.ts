/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Axios from 'axios';
import { createHash } from 'crypto';
import { closeSync, mkdirSync, openSync, writeSync } from 'fs';
import { dirname } from 'path';
import { LevelLogger } from '../../lib';

/**
 * Download a url and calculate it's checksum
 * @param  {String} url
 * @param  {String} path
 * @return {Promise<String>} checksum of the downloaded file
 */
export async function download(url: string, path: string, logger: LevelLogger) {
  logger.info(`Downloading ${url} to ${path}`);

  const hash = createHash('md5');

  mkdirSync(dirname(path), { recursive: true });
  const handle = openSync(path, 'w');

  try {
    const resp = await Axios.request({
      url,
      method: 'GET',
      responseType: 'stream',
    });

    resp.data.on('data', (chunk: Buffer) => {
      writeSync(handle, chunk);
      hash.update(chunk);
    });

    await new Promise((resolve, reject) => {
      resp.data
        .on('error', (err: Error) => {
          logger.error(err);
          reject(err);
        })
        .on('end', () => {
          logger.info(`Downloaded ${url}`);
          resolve();
        });
    });
  } finally {
    closeSync(handle);
  }

  return hash.digest('hex');
}
