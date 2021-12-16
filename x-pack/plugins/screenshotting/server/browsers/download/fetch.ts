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
import { finished, Readable } from 'stream';
import { promisify } from 'util';
import type { Logger } from 'src/core/server';

/**
 * Download a url and calculate it's checksum
 */
export async function fetch(url: string, path: string, logger?: Logger): Promise<string> {
  logger?.info(`Downloading ${url} to ${path}`);

  const hash = createHash('md5');

  mkdirSync(dirname(path), { recursive: true });
  const handle = openSync(path, 'w');

  try {
    const response = await Axios.request<Readable>({
      url,
      method: 'GET',
      responseType: 'stream',
    });

    response.data.on('data', (chunk: Buffer) => {
      writeSync(handle, chunk);
      hash.update(chunk);
    });

    await promisify(finished)(response.data, { writable: false });
    logger?.info(`Downloaded ${url}`);
  } catch (error) {
    logger?.error(error);

    throw new Error(`Unable to download ${url}: ${error}`);
  } finally {
    closeSync(handle);
  }

  return hash.digest('hex');
}
