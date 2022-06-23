/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'fs/promises';

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

const mockLoggerFactory = loggingSystemMock.create();
const mockLogger = mockLoggerFactory.get('mock logger');
import { getGpgKeyOrUndefined, _readGpgKey } from './package_verification';

const mockGetConfig = jest.fn();
jest.mock('../../app_context', () => ({
  appContextService: {
    getConfig: () => mockGetConfig(),
    getLogger: () => mockLogger,
  },
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

const mockedReadFile = readFile as jest.MockedFunction<typeof readFile>;

beforeEach(() => {
  jest.resetAllMocks();
});
describe('getGpgKeyOrUndefined', () => {
  it('should cache the gpg key after reading file once', async () => {
    const keyContent = 'this is the gpg key';
    mockedReadFile.mockResolvedValue(Buffer.from(keyContent));
    mockGetConfig.mockReturnValue({ packageVerification: { gpgKeyPath: 'somePath' } });
    expect(await getGpgKeyOrUndefined()).toEqual(keyContent);
    expect(await getGpgKeyOrUndefined()).toEqual(keyContent);
    expect(mockedReadFile).toHaveBeenCalledWith('somePath');
    expect(mockedReadFile).toHaveBeenCalledTimes(1);
  });
});

describe('_readGpgKey', () => {
  it('should return undefined if the key file isnt configured', async () => {
    mockedReadFile.mockResolvedValue(Buffer.from('this is the gpg key'));
    mockGetConfig.mockReturnValue({ packageVerification: {} });

    expect(await _readGpgKey()).toEqual(undefined);
  });
  it('should return undefined if there is an error reading the file', async () => {
    mockedReadFile.mockRejectedValue(new Error('some error'));
    mockGetConfig.mockReturnValue({ packageVerification: { gpgKeyPath: 'somePath' } });
    expect(await _readGpgKey()).toEqual(undefined);
    expect(mockedReadFile).toHaveBeenCalledWith('somePath');
  });
});
