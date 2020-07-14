/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';
import del from 'del';
import { readFileSync } from 'fs';
import { resolve as resolvePath } from 'path';
import { Readable } from 'stream';
import { LevelLogger } from '../../lib';
import { download } from './download';

const TEMP_DIR = resolvePath(__dirname, '__tmp__');
const TEMP_FILE = resolvePath(TEMP_DIR, 'foo/bar/download');

class ReadableOf extends Readable {
  constructor(private readonly responseBody: string) {
    super();
  }

  _read() {
    this.push(this.responseBody);
    this.push(null);
  }
}

jest.mock('axios');
const request: jest.Mock = jest.requireMock('axios').request;

const mockLogger = ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
} as unknown) as LevelLogger;

test('downloads the url to the path', async () => {
  const BODY = 'abdcefg';
  request.mockImplementationOnce(async () => {
    return {
      data: new ReadableOf(BODY),
    };
  });

  await download('url', TEMP_FILE, mockLogger);
  expect(readFileSync(TEMP_FILE, 'utf8')).toEqual(BODY);
});

test('returns the md5 hex hash of the http body', async () => {
  const BODY = 'foobar';
  const HASH = createHash('md5').update(BODY).digest('hex');
  request.mockImplementationOnce(async () => {
    return {
      data: new ReadableOf(BODY),
    };
  });

  const returned = await download('url', TEMP_FILE, mockLogger);
  expect(returned).toEqual(HASH);
});

test('throws if request emits an error', async () => {
  request.mockImplementationOnce(async () => {
    throw new Error('foo');
  });

  return expect(download('url', TEMP_FILE, mockLogger)).rejects.toThrow('foo');
});

afterEach(async () => await del(TEMP_DIR));
