/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Axios from 'axios';
import { createHash } from 'crypto';
import { mkdir, open } from 'fs/promises';
import { writeSync } from 'fs';
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

  const hash = createHash('sha256');

  await mkdir(dirname(path), { recursive: true });
  const handle = await open(path, 'w');
  try {
    const resp = await Axios.request({
      url,
      method: 'GET',
      responseType: 'stream',
    });

    resp.data.on('data', (chunk: Buffer) => {
      writeSync(handle.fd, chunk);
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
  } catch (err) {
    throw new Error(`Unable to download ${url}: ${err}`);
  } finally {
    await handle.close();
  }

  return hash.digest('hex');
}
