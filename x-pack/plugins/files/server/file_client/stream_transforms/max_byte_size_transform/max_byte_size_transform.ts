/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Transform } from 'stream';
import { MaxByteSizeExceededError } from './errors';

export function enforceMaxByteSizeTransform(maxByteSize: number) {
  let bytesSeen: number = 0;
  return new Transform({
    transform(chunk: Buffer, _, cb) {
      if (!Buffer.isBuffer(chunk))
        throw new Error(`Received a non-buffer chunk. All chunk must be buffers.`);

      bytesSeen += chunk.byteLength;
      if (bytesSeen > maxByteSize) {
        cb(new MaxByteSizeExceededError(maxByteSize));
      } else {
        cb(null, chunk);
      }
    },
  });
}
