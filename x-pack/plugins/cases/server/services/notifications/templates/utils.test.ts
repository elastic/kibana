/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path, { join, resolve } from 'path';
import { getTemplateFilePath } from './utils';

describe('getTemplateFilePath', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves path correctly', async () => {
    const resolveSpy = jest.spyOn(path, 'resolve').mockReturnValueOnce('../fake_path');
    const dataPath = getTemplateFilePath('', 'foo.js');

    expect(dataPath).toEqual('../fake_path');
    resolveSpy.mockRestore();
  });

  it('resolves path correctly with different directory name', async () => {
    const dataPath = getTemplateFilePath('../sample', 'foo.js');

    const expectedPath = resolve(join(__dirname, '..', 'templates', '../sample', 'foo.js'));

    expect(dataPath).toEqual(expectedPath);
  });

  it('throws error correctly', async () => {
    const getTemplateFilePathMock = jest.fn().mockImplementation(() => {
      throw new Error('Error finding the file!');
    });

    expect(() => getTemplateFilePathMock('../sample', 'foo.js')).toThrowErrorMatchingInlineSnapshot(
      '"Error finding the file!"'
    );
  });
});
