/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('fs');

import { createReadStream, ReadStream } from 'fs';
import { Readable } from 'stream';
import { sha256 } from './checksum';

describe('sha256', () => {
  let stream: ReadStream;

  beforeEach(() => {
    stream = new Readable({
      read() {
        this.push('something');
        this.push(null);
      },
    }) as typeof stream;

    (createReadStream as jest.MockedFunction<typeof createReadStream>).mockReturnValue(stream);
  });

  it('should return an sha256 hash', async () => {
    await expect(sha256('path')).resolves.toBe('437b930db84b8079c2dd804a71936b5f');
  });

  it('should reject on stream error', async () => {
    const error = new Error('Some error');
    stream.destroy(error);

    await expect(sha256('path')).rejects.toEqual(error);
  });
});
