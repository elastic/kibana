/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../routes/security');

import type { MockedLogger } from '@kbn/logging-mocks';

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';

import { FleetUnauthorizedError } from '../../errors';
import type { InstallablePackage } from '../../types';

import type { PackageClient, PackageService } from './package_service';
import { PackageServiceImpl } from './package_service';
import * as epmPackagesGet from './packages/get';
import * as epmPackagesInstall from './packages/install';
import * as epmRegistry from './registry';
import * as epmTransformsInstall from './elasticsearch/transform/install';

const testKeys = [
  'getInstallation',
  'ensureInstalledPackage',
  'fetchFindLatestPackage',
  'getRegistryPackage',
  'reinstallEsAssets',
];

function getTest(
  mocks: {
    packageClient: PackageClient;
    esClient?: ElasticsearchClient;
    soClient?: SavedObjectsClientContract;
    logger?: MockedLogger;
  },
  testKey: string
) {
  let test: {
    method: Function;
    args: any[];
    spy: jest.SpyInstance;
    spyArgs: any[];
    spyResponse: any;
  };

  switch (testKey) {
    case testKeys[0]:
      test = {
        method: mocks.packageClient.getInstallation.bind(mocks.packageClient),
        args: ['package name'],
        spy: jest.spyOn(epmPackagesGet, 'getInstallation'),
        spyArgs: [
          {
            pkgName: 'package name',
            savedObjectsClient: mocks.soClient,
          },
        ],
        spyResponse: { name: 'getInstallation test' },
      };
      break;
    case testKeys[1]:
      test = {
        method: mocks.packageClient.ensureInstalledPackage.bind(mocks.packageClient),
        args: [{ pkgName: 'package name', pkgVersion: '8.0.0', spaceId: 'spaceId' }],
        spy: jest.spyOn(epmPackagesInstall, 'ensureInstalledPackage'),
        spyArgs: [
          {
            pkgName: 'package name',
            pkgVersion: '8.0.0',
            spaceId: 'spaceId',
            esClient: mocks.esClient,
            savedObjectsClient: mocks.soClient,
          },
        ],
        spyResponse: { name: 'ensureInstalledPackage test' },
      };
      break;
    case testKeys[2]:
      test = {
        method: mocks.packageClient.fetchFindLatestPackage.bind(mocks.packageClient),
        args: ['package name'],
        spy: jest.spyOn(epmRegistry, 'fetchFindLatestPackageOrThrow'),
        spyArgs: ['package name'],
        spyResponse: { name: 'fetchFindLatestPackage test' },
      };
      break;
    case testKeys[3]:
      test = {
        method: mocks.packageClient.getRegistryPackage.bind(mocks.packageClient),
        args: ['package name', '8.0.0'],
        spy: jest.spyOn(epmRegistry, 'getRegistryPackage'),
        spyArgs: ['package name', '8.0.0'],
        spyResponse: {
          packageInfo: { name: 'getRegistryPackage test' },
          paths: ['/some/test/path'],
        },
      };
      break;
    case testKeys[4]:
      const pkg: InstallablePackage = {
        format_version: '1.0.0',
        name: 'package name',
        title: 'package title',
        description: 'package description',
        version: '8.0.0',
        release: 'ga',
        owner: { github: 'elastic' },
      };
      const paths = ['some/test/transform/path'];

      test = {
        method: mocks.packageClient.reinstallEsAssets.bind(mocks.packageClient),
        args: [pkg, paths],
        spy: jest.spyOn(epmTransformsInstall, 'installTransform'),
        spyArgs: [pkg, paths, mocks.esClient, mocks.soClient, mocks.logger],
        spyResponse: [
          {
            name: 'package name',
          },
        ],
      };
      break;
    default:
      throw new Error('invalid test key');
  }

  return test;
}

describe('PackageService', () => {
  let mockPackageService: PackageService;
  let mockEsClient: ElasticsearchClient;
  let mockSoClient: SavedObjectsClientContract;
  let mockLogger: MockedLogger;

  beforeEach(() => {
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockSoClient = savedObjectsClientMock.create();
    mockLogger = loggingSystemMock.createLogger();
    mockPackageService = new PackageServiceImpl(mockEsClient, mockSoClient, mockLogger);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('asScoped', () => {
    describe.each(testKeys)('without required privileges', (testKey: string) => {
      const unauthError = new FleetUnauthorizedError(
        `User does not have adequate permissions to access Fleet packages.`
      );

      it(`rejects on ${testKey}`, async () => {
        const { method, args } = getTest(
          { packageClient: mockPackageService.asScoped(httpServerMock.createKibanaRequest()) },
          testKey
        );
        await expect(method(...args)).rejects.toThrowError(unauthError);
      });
    });

    describe.each(testKeys)('with required privileges', (testKey: string) => {
      it(`calls ${testKey} and returns results`, async () => {
        const mockClients = {
          packageClient: mockPackageService.asInternalUser,
          esClient: mockEsClient,
          soClient: mockSoClient,
          logger: mockLogger,
        };
        const { method, args, spy, spyArgs, spyResponse } = getTest(mockClients, testKey);
        spy.mockResolvedValue(spyResponse);

        await expect(method(...args)).resolves.toEqual(spyResponse);
        expect(spy).toHaveBeenCalledWith(...spyArgs);
      });
    });
  });

  describe.each(testKeys)('asInternalUser', (testKey: string) => {
    it(`calls ${testKey} and returns results`, async () => {
      const mockClients = {
        packageClient: mockPackageService.asInternalUser,
        esClient: mockEsClient,
        soClient: mockSoClient,
        logger: mockLogger,
      };
      const { method, args, spy, spyArgs, spyResponse } = getTest(mockClients, testKey);
      spy.mockResolvedValue(spyResponse);

      await expect(method(...args)).resolves.toEqual(spyResponse);
      expect(spy).toHaveBeenCalledWith(...spyArgs);
    });
  });
});
