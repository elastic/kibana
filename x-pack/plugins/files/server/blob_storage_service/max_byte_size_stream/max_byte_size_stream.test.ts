/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable, Writable, pipeline } from 'stream';
import { promisify } from 'util';
import { MaxByteSize } from './max_byte_size_stream';

const pipe = promisify(pipeline);

class DummyWrite extends Writable {
  public chunks: string[] = [];
  _write(chunk: any, encoding: BufferEncoding, cb: (error?: Error | null) => void): void {
    this.chunks.push(chunk.toString());
    cb(null);
  }
}

describe('MaxByteSizeStream', () => {
  it('should allow data to stream through it', async () => {
    const data = 'abc'.repeat(10);
    const dataStream = [data, data, data];
    const src = Readable.from(dataStream);
    const dest = new DummyWrite();
    await pipe(src, MaxByteSize.create({ maxByteSize: Infinity }), dest);
    expect(dest.chunks.join('')).toEqual(dataStream.join(''));
  });
  it('should throw an error when the max number of bytes has been reached', async () => {
    const data = 'abc'.repeat(10);
    const dataStream = [data, data, data];
    const src = Readable.from(dataStream);
    const dest = new DummyWrite();
    await expect(() =>
      pipe(src, MaxByteSize.create({ maxByteSize: 5 }), dest)
    ).rejects.toThrowError(new Error('Maximum of 5 bytes exceeded'));
  });
});
