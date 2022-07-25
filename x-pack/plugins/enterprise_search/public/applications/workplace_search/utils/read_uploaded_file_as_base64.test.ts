/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readUploadedFileAsBase64 } from '.';

describe('readUploadedFileAsBase64', () => {
  it('reads a file and returns base64 string', async () => {
    const file = new File(['a mock file'], 'mockFile.png', { type: 'img/png' });
    const text = await readUploadedFileAsBase64(file);
    expect(text).toEqual('YSBtb2NrIGZpbGU=');
  });

  it('throws an error if the file cannot be read', async () => {
    const badFile = 'causes an error' as unknown as File;
    await expect(readUploadedFileAsBase64(badFile)).rejects.toThrow();
  });
});
