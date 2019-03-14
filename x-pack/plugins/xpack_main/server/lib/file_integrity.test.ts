/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './file_integrity.test.mocks';

import { getIntegrityHash, getIntegrityHashes } from './file_integrity';

describe('Integrity Hash', () => {
  it('creates a hash from a file given a file path', async () => {
    const filePath = 'somepath.json';
    const expectedHash = '3295d40d2f35ac27145d37fcd5cdc80b';
    const integrityHash = await getIntegrityHash(filePath);
    expect(integrityHash).toEqual(expectedHash);
  });

  it('returns null on error', async () => {
    const filePath = 'ERROR';
    const integrityHash = await getIntegrityHash(filePath);
    expect(integrityHash).toEqual(null);
  });
});

describe('Integrity Hashes', () => {
  it('returns an object with each filename and its hash', async () => {
    const filePaths = ['somepath1.json', 'somepath2.json'];
    const integrityHashes = await getIntegrityHashes(filePaths);
    expect(integrityHashes).toEqual({
      'somepath1.json': '8cbfe6a9f8174b2d7e77c2111a84f0e6',
      'somepath2.json': '4177c075ade448d6e69fd94b39d0be15',
    });
  });
});
