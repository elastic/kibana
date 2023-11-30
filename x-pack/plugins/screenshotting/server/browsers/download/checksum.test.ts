/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('fs');

import { createReadStream, ReadStream } from 'fs';
import { Readable } from 'stream';
import { sha1 } from './checksum';

describe('sha1', () => {
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

  it('should return an sha1 hash', async () => {
    expect(await sha1('path')).toMatchInlineSnapshot(`"1af17e73721dbe0c40011b82ed4bb1a7dbe3ce29"`);
  });

  it('should reject on stream error', async () => {
    const error = new Error('Some error');
    stream.destroy(error);

    await expect(sha1('path')).rejects.toEqual(error);
  });
});
