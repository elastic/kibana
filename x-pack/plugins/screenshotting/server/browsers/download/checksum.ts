/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { finished } from 'stream/promises';

export async function sha1(path: string) {
  const hash = createHash('sha1');
  const stream = createReadStream(path);

  stream.on('data', (chunk) => hash.update(chunk));
  await finished(stream);

  return hash.digest('hex');
}
