/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import mockFs from 'mock-fs';
import axios from 'axios';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve as resolvePath } from 'path';
import { Readable } from 'stream';
import { fetch } from './fetch';

const TEMP_DIR = resolvePath(__dirname, '__tmp__');
const TEMP_FILE = resolvePath(TEMP_DIR, 'foo/bar/download');

describe('fetch', () => {
  beforeEach(() => {
    jest.spyOn(axios, 'request').mockResolvedValue({
      data: new Readable({
        read() {
          this.push('foobar');
          this.push(null);
        },
      }),
    });

    mockFs();
  });

  afterEach(() => {
    mockFs.restore();
    jest.resetAllMocks();
  });

  test('downloads the url to the path', async () => {
    await fetch('url', TEMP_FILE);

    expect(readFileSync(TEMP_FILE, 'utf8')).toEqual('foobar');
  });

  test('returns the md5 hex hash of the http body', async () => {
    const hash = createHash('md5').update('foobar').digest('hex');

    await expect(fetch('url', TEMP_FILE)).resolves.toEqual(hash);
  });

  test('throws if request emits an error', async () => {
    (axios.request as jest.Mock).mockImplementationOnce(async () => {
      throw new Error('foo');
    });

    await expect(fetch('url', TEMP_FILE)).rejects.toThrow('foo');
  });
});
