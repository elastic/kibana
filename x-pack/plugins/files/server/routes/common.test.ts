/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { File } from '../file';
import { getDownloadHeadersForFile } from './common';

describe('getDownloadHeadersForFile', () => {
  function t({ cd, ct }: { cd: string; ct: string }) {
    return {
      'content-type': ct,
      'content-disposition': `attachment; filename="${cd}"`,
    };
  }

  const file = { data: { name: 'test', mimeType: undefined } } as unknown as File;
  test('no mime type and name from file object', () => {
    expect(getDownloadHeadersForFile(file, undefined)).toEqual(
      t({ ct: 'application/octet-stream', cd: 'test' })
    );
  });

  test('no mime type and name (without ext)', () => {
    expect(getDownloadHeadersForFile(file, 'myfile')).toEqual(
      t({ ct: 'application/octet-stream', cd: 'myfile' })
    );
  });
  test('no mime type and name (with ext)', () => {
    expect(getDownloadHeadersForFile(file, 'myfile.png')).toEqual(
      t({ ct: 'image/png', cd: 'myfile.png' })
    );
  });
  test('mime type and no name', () => {
    const fileWithMime = { data: { ...file.data, mimeType: 'application/pdf' } } as File;
    expect(getDownloadHeadersForFile(fileWithMime, undefined)).toEqual(
      t({ ct: 'application/pdf', cd: 'test' })
    );
  });
  test('mime type and name', () => {
    const fileWithMime = { data: { ...file.data, mimeType: 'application/pdf' } } as File;
    expect(getDownloadHeadersForFile(fileWithMime, 'a cool file.pdf')).toEqual(
      t({ ct: 'application/pdf', cd: 'a cool file.pdf' })
    );
  });
});
