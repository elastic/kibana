/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import mockFs from 'mock-fs';
import { readFileSync } from 'fs';
import { ExtractError } from './extract_error';
import { unzip } from './unzip';

describe('unzip', () => {
  beforeEach(() => {
    mockFs({
      '/test.zip': Buffer.from(
        'UEsDBAoAAgAAANh0ElMMfn/YBAAAAAQAAAAIABwAdGVzdC50eHRVVAkAA1f/HGFX/xxhdXgLAAEE9QEAAAQUAAAAdGVzdFBLAQIeAwoAAgAAANh0ElMMfn/YBAAAAAQAAAAIABgAAAAAAAEAAACkgQAAAAB0ZXN0LnR4dFVUBQADV/8cYXV4CwABBPUBAAAEFAAAAFBLBQYAAAAAAQABAE4AAABGAAAAAAA=',
        'base64'
      ),
      '/invalid.zip': 'test',
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('should extract zipped contents', async () => {
    await unzip('/test.zip', '/output');

    expect(readFileSync('/output/test.txt').toString()).toEqual('test');
  });

  it('should reject on invalid archive', async () => {
    await expect(unzip('/invalid.zip', '/output')).rejects.toBeInstanceOf(ExtractError);
  });
});
