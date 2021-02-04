/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readUploadedFileAsText } from './utils';

describe('readUploadedFileAsText', () => {
  it('reads a file as text', async () => {
    const file = new File(['a mock file'], 'mockFile.json');
    const text = await readUploadedFileAsText(file);
    expect(text).toEqual('a mock file');
  });

  it('throws an error if the file cannot be read', async () => {
    const badFile = ('causes an error' as unknown) as File;
    await expect(readUploadedFileAsText(badFile)).rejects.toThrow();
  });
});
