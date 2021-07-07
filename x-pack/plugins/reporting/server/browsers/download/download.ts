/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Axios from 'axios';
import { createHash } from 'crypto';
import { closeSync, mkdirSync, openSync, writeSync } from 'fs';
import { dirname } from 'path';
import { GenericLevelLogger } from '../../lib/level_logger';

/**
 * Download a url and calculate it's checksum
 */
export async function download(
  url: string,
  path: string,
  logger: GenericLevelLogger
): Promise<string> {
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

    await new Promise<void>((resolve, reject) => {
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
