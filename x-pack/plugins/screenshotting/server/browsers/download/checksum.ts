/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { finished } from 'stream';
import { promisify } from 'util';

export async function md5(path: string) {
  const hash = createHash('md5');
  const stream = createReadStream(path);

  stream.on('data', (chunk) => hash.update(chunk));
  await promisify(finished)(stream, { writable: false });

  return hash.digest('hex');
}
