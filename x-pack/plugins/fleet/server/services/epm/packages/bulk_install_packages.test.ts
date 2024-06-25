/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { times } from 'lodash';

import { appContextService } from '../..';

import { createAppContextStartContractMock } from '../../../mocks';

import { fetchFindLatestPackageOrThrow } from '../registry';

import { bulkInstallPackages } from './bulk_install_packages';
import { installPackage } from './install';

jest.mock('./install');
jest.mock('../registry');

const mockedInstallPackage = jest.mocked(installPackage);
const mockedFetchFindLatestPackageOrThrow = jest.mocked(fetchFindLatestPackageOrThrow);

describe('bulkInstallPackages', () => {
  let mockContract: ReturnType<typeof createAppContextStartContractMock>;
  const mockSoClient = savedObjectsClientMock.create();
  const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();

  mockedFetchFindLatestPackageOrThrow.mockImplementation(async (pkgName: string) => {
    return {
      name: pkgName,
      version: '1.0.0',
      title: pkgName,
      description: 'Test',
      release: 'experimental',
      owner: 'elastic',
      prerelease: true,
      skipDataStreamRollover: false,
    } as any;
  });

  beforeEach(() => {
    mockContract = createAppContextStartContractMock();
    appContextService.start(mockContract);
    mockedInstallPackage.mockClear();
    mockedFetchFindLatestPackageOrThrow.mockClear();
  });

  describe('only makes one installation attempt per unique package name', () => {
    test('with plain strings', async () => {
      const NUM_PACKAGES = 50000;

      const packagesToInstall = times(NUM_PACKAGES, () => 'test_package');

      await bulkInstallPackages({
        savedObjectsClient: mockSoClient,
        packagesToInstall,
        esClient: mockEsClient,
        spaceId: 'default',
      });

      expect(mockedInstallPackage).toHaveBeenCalledTimes(1);
    });

    test('with objects', async () => {
      const NUM_PACKAGES = 50000;

      const packagesToInstall = times(NUM_PACKAGES, () => ({
        name: 'test_package',
        version: 'latest',
      }));

      await bulkInstallPackages({
        savedObjectsClient: mockSoClient,
        packagesToInstall,
        esClient: mockEsClient,
        spaceId: 'default',
      });

      expect(mockedInstallPackage).toHaveBeenCalledTimes(1);
    });
    test('with a mixture of plain strings and objects', async () => {
      const NUM_PACKAGES = 20000;

      const stringPackagesToInstall = times(NUM_PACKAGES, () => 'test_package_1');
      const objectPackagesToInstall = times(NUM_PACKAGES, () => ({
        name: 'test_package_2',
        version: 'latest',
      }));

      await bulkInstallPackages({
        savedObjectsClient: mockSoClient,
        packagesToInstall: [...stringPackagesToInstall, ...objectPackagesToInstall],
        esClient: mockEsClient,
        spaceId: 'default',
      });

      expect(mockedInstallPackage).toHaveBeenCalledTimes(2);
    });
  });
});
