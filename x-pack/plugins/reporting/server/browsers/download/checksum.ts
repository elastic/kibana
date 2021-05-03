/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { Readable } from 'stream';

function readableEnd(stream: Readable) {
  return new Promise((resolve, reject) => {
    stream.on('error', reject).on('end', resolve);
  });
}

export async function md5(path: string) {
  const hash = createHash('md5');
  await readableEnd(createReadStream(path).on('data', (chunk) => hash.update(chunk)));
  return hash.digest('hex');
}
