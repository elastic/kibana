/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'fs/promises';

let mockKibanaVersion = '300.0.0';
let mockConfig = {};
jest.mock('../app_context', () => {
  const { loggerMock } = jest.requireActual('@kbn/logging-mocks');
  return {
    appContextService: {
      getLogger: () => loggerMock.create(),
      getKibanaVersion: () => mockKibanaVersion,
      getConfig: () => mockConfig,
    },
  };
});

jest.mock('fs/promises');

const mockedReadFile = readFile as jest.MockedFunction<typeof readFile>;
import { getAvailableVersions } from './versions';

describe('getAvailableVersions', () => {
  it('should return available version and filter version < 7.17', async () => {
    mockKibanaVersion = '300.0.0';
    mockedReadFile.mockResolvedValue(`["8.1.0", "8.0.0", "7.17.0", "7.16.0"]`);

    const res = await getAvailableVersions({ cached: false, includeCurrentVersion: true });

    expect(res).toEqual(['300.0.0', '8.1.0', '8.0.0', '7.17.0']);
  });

  it('should not strip -SNAPSHOT from kibana version', async () => {
    mockKibanaVersion = '300.0.0-SNAPSHOT';
    mockedReadFile.mockResolvedValue(`["8.1.0", "8.0.0", "7.17.0", "7.16.0"]`);

    const res = await getAvailableVersions({ cached: false, includeCurrentVersion: true });
    expect(res).toEqual(['300.0.0-SNAPSHOT', '8.1.0', '8.0.0', '7.17.0']);
  });

  it('should not include the current version if includeCurrentVersion is not set', async () => {
    mockKibanaVersion = '300.0.0-SNAPSHOT';
    mockConfig = {
      internal: {
        onlyAllowAgentUpgradeToKnownVersions: true,
      },
    };
    mockedReadFile.mockResolvedValue(`["8.1.0", "8.0.0", "7.17.0", "7.16.0"]`);

    const res = await getAvailableVersions({ cached: false });

    expect(res).toEqual(['8.1.0', '8.0.0', '7.17.0']);
  });

  it('should not include the current version if includeCurrentVersion = false', async () => {
    mockKibanaVersion = '300.0.0-SNAPSHOT';
    mockedReadFile.mockResolvedValue(`["8.1.0", "8.0.0", "7.17.0", "7.16.0"]`);

    const res = await getAvailableVersions({ cached: false, includeCurrentVersion: false });

    expect(res).toEqual(['8.1.0', '8.0.0', '7.17.0']);
  });

  it('should return kibana version only if cannot read versions', async () => {
    mockKibanaVersion = '300.0.0';
    mockConfig = {
      internal: {
        onlyAllowAgentUpgradeToKnownVersions: false,
      },
    };
    mockedReadFile.mockRejectedValue({ code: 'ENOENT' });

    const res = await getAvailableVersions({ cached: false });

    expect(res).toEqual(['300.0.0']);
  });
});
