/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { getDataPath } from './utils';

describe('getDataPath', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const resolveSpy = jest.spyOn(path, 'resolve').mockReturnValueOnce('../fake_path');

  afterEach(() => {
    resolveSpy.mockRestore();
  });

  it('resolves path correctly', async () => {
    const dataPath = getDataPath('', 'foo.js');

    expect(dataPath).toEqual('../fake_path/foo.js');
  });

  it('resolves path correctly with different directory name', async () => {
    const dataPath = getDataPath('../sample', 'foo.js');

    expect(dataPath).not.toEqual('../fake_path/foo.js');
  });

  it('throws error correctly', async () => {
    const getDataPathMock = jest.fn().mockImplementation(() => {
      throw new Error('Error finding the file!');
    });

    expect(() => getDataPathMock('../sample', 'foo.js')).toThrowErrorMatchingInlineSnapshot(
      '"Error finding the file!"'
    );
  });
});
