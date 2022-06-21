/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Transform } from 'stream';
import { MaxByteSizeExceededError } from './errors';

export class MaxByteSizeTransform extends Transform {
  private bytesSeen = 0;

  constructor(
    private readonly maxByteSize: number,
    private readonly encoding: 'utf8' | 'base64' = 'utf8'
  ) {
    super();
  }

  _transform = (
    chunk: Buffer | string,
    encoding: BufferEncoding,
    cb: (err: Error | null | undefined, chunk?: Buffer | string) => void
  ) => {
    this.bytesSeen += Buffer.isBuffer(chunk)
      ? chunk.byteLength
      : Buffer.byteLength(chunk, this.encoding);
    if (this.bytesSeen > this.maxByteSize) {
      cb(new MaxByteSizeExceededError(this.maxByteSize));
    } else {
      cb(null, chunk);
    }
  };

  public static create({
    maxByteSize,
    encoding,
  }: {
    maxByteSize: number;
    encoding?: 'utf8' | 'base64';
  }): Transform {
    return new MaxByteSizeTransform(maxByteSize, encoding);
  }
}
