/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { openSync, writeSync, closeSync } from 'fs';
import { createHash } from 'crypto';
import { dirname } from 'path';

import mkdirp from 'mkdirp';
import request from 'request';

import { log, readableEnd } from './util';

/**
 * Download a url and calculate it's checksum
 * @param  {String} url
 * @param  {String} path
 * @return {Promise<String>} checksum of the downloaded file
 */
export async function download(url, path) {
  log(`Downloading ${url}`);

  const hash = createHash('md5');

  mkdirp.sync(dirname(path));
  const handle = openSync(path, 'w');

  try {
    const readable = request(url).on('data', chunk => {
      writeSync(handle, chunk);
      hash.update(chunk);
    });
    await readableEnd(readable);
  } finally {
    closeSync(handle);
  }

  return hash.digest('hex');
}
