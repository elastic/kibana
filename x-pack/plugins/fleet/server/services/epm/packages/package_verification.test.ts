/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'fs/promises';

import { getGpgKey } from './package_verification';
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

const mockedReadFile = readFile as jest.MockedFunction<typeof readFile>;

describe('getGpgKey', () => {
  it('should cache the gpg key after reading file once', async () => {
    const config = { gpgKeyPath: 'somePath' };
    const keyContent = 'this is the gpg key';
    mockedReadFile.mockResolvedValue(Buffer.from(keyContent));

    expect(await getGpgKey(config)).toEqual(keyContent);
    expect(await getGpgKey(config)).toEqual(keyContent);
    expect(mockedReadFile).toHaveBeenCalledWith('somePath');
    expect(mockedReadFile).toHaveBeenCalledTimes(1);
  });
});
