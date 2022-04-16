/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../registry');

import type { SavedObjectsClientContract, SavedObjectsFindResult } from '@kbn/core/server';

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { PACKAGES_SAVED_OBJECT_TYPE, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../common';
import type { PackagePolicySOAttributes, RegistryPackage } from '../../../../common';

import * as Registry from '../registry';

import { createAppContextStartContractMock } from '../../../mocks';
import { appContextService } from '../../app_context';

import { PackageNotFoundError } from '../../../errors';

import { getPackageInfo, getPackageUsageStats } from './get';

const MockRegistry = Registry as jest.Mocked<typeof Registry>;

describe('When using EPM `get` services', () => {
  describe('and invoking getPackageUsageStats()', () => {
    let soClient: jest.Mocked<SavedObjectsClientContract>;

    beforeEach(() => {
      soClient = savedObjectsClientMock.create();
      const savedObjects: Array<SavedObjectsFindResult<PackagePolicySOAttributes>> = [
        {
          type: 'ingest-package-policies',
          id: 'dcf83172-c38e-4501-b236-9f479da8a7d6',
          attributes: {
            name: 'system-3',
            description: '',
            namespace: 'default',
            policy_id: '22222-22222-2222-2222',
            enabled: true,
            output_id: '',
            inputs: [],
            package: { name: 'system', title: 'System', version: '0.10.4' },
            revision: 1,
            created_at: '2020-12-22T21:28:05.380Z',
            created_by: 'elastic',
            updated_at: '2020-12-22T21:28:05.380Z',
            updated_by: 'elastic',
          },
          references: [],
          migrationVersion: { 'ingest-package-policies': '7.11.0' },
          updated_at: '2020-12-22T21:28:05.383Z',
          version: 'WzE1NTAsMV0=',
          score: 0,
        },
        {
          type: 'ingest-package-policies',
          id: '5b61eb5c-d94c-48a6-a17c-b0d1f7c65336',
          attributes: {
            name: 'system-1',
            namespace: 'default',
            package: { name: 'system', title: 'System', version: '0.10.4' },
            enabled: true,
            policy_id: '11111-111111-11111-11111', // << duplicate id with plicy below
            output_id: 'ca111b80-43c1-11eb-84bf-7177b74381c5',
            inputs: [],
            revision: 1,
            created_at: '2020-12-21T19:22:04.902Z',
            created_by: 'system',
            updated_at: '2020-12-21T19:22:04.902Z',
            updated_by: 'system',
          },
          references: [],
          migrationVersion: { 'ingest-package-policies': '7.11.0' },
          updated_at: '2020-12-21T19:22:04.905Z',
          version: 'WzIxNSwxXQ==',
          score: 0,
        },
        {
          type: 'ingest-package-policies',
          id: 'dcf83172-c38e-4501-b236-9f479da8a7d6',
          attributes: {
            name: 'system-2',
            description: '',
            namespace: 'default',
            policy_id: '11111-111111-11111-11111',
            enabled: true,
            output_id: '',
            inputs: [],
            package: { name: 'system', title: 'System', version: '0.10.4' },
            revision: 1,
            created_at: '2020-12-22T21:28:05.380Z',
            created_by: 'elastic',
            updated_at: '2020-12-22T21:28:05.380Z',
            updated_by: 'elastic',
          },
          references: [],
          migrationVersion: { 'ingest-package-policies': '7.11.0' },
          updated_at: '2020-12-22T21:28:05.383Z',
          version: 'WzE1NTAsMV0=',
          score: 0,
        },
        {
          type: 'ingest-package-policies',
          id: 'dcf83172-c38e-4501-b236-9f479da8a7d6',
          attributes: {
            name: 'system-4',
            description: '',
            namespace: 'default',
            policy_id: '33333-33333-333333-333333',
            enabled: true,
            output_id: '',
            inputs: [],
            package: { name: 'system', title: 'System', version: '0.10.4' },
            revision: 1,
            created_at: '2020-12-22T21:28:05.380Z',
            created_by: 'elastic',
            updated_at: '2020-12-22T21:28:05.380Z',
            updated_by: 'elastic',
          },
          references: [],
          migrationVersion: { 'ingest-package-policies': '7.11.0' },
          updated_at: '2020-12-22T21:28:05.383Z',
          version: 'WzE1NTAsMV0=',
          score: 0,
        },
      ];
      soClient.find.mockImplementation(async ({ page = 1, perPage = 20 }) => {
        let savedObjectsResponse: typeof savedObjects;

        switch (page) {
          case 1:
            savedObjectsResponse = [savedObjects[0]];
            break;
          case 2:
            savedObjectsResponse = savedObjects.slice(1);
            break;
          default:
            savedObjectsResponse = [];
        }

        return {
          page,
          per_page: perPage,
          total: 1500,
          saved_objects: savedObjectsResponse,
        };
      });
    });

    it('should query and paginate SO using package name as filter', async () => {
      await getPackageUsageStats({ savedObjectsClient: soClient, pkgName: 'system' });
      expect(soClient.find).toHaveBeenNthCalledWith(1, {
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        perPage: 1000,
        page: 1,
        filter: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.package.name: system`,
      });
      expect(soClient.find).toHaveBeenNthCalledWith(2, {
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        perPage: 1000,
        page: 2,
        filter: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.package.name: system`,
      });
      expect(soClient.find).toHaveBeenNthCalledWith(3, {
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        perPage: 1000,
        page: 3,
        filter: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.package.name: system`,
      });
    });

    it('should return count of unique agent policies', async () => {
      expect(
        await getPackageUsageStats({ savedObjectsClient: soClient, pkgName: 'system' })
      ).toEqual({
        agent_policy_count: 3,
      });
    });
  });

  describe('getPackageInfo', () => {
    beforeEach(() => {
      const mockContract = createAppContextStartContractMock();
      appContextService.start(mockContract);
      MockRegistry.fetchFindLatestPackageOrUndefined.mockResolvedValue({
        name: 'my-package',
        version: '1.0.0',
      } as RegistryPackage);
      MockRegistry.getRegistryPackage.mockResolvedValue({
        paths: [],
        packageInfo: {
          name: 'my-package',
          version: '1.0.0',
        } as RegistryPackage,
      });
    });

    describe('installation status', () => {
      it('should be not_installed when no package SO exists', async () => {
        const soClient = savedObjectsClientMock.create();
        soClient.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());

        expect(
          await getPackageInfo({
            savedObjectsClient: soClient,
            pkgName: 'my-package',
            pkgVersion: '1.0.0',
          })
        ).toMatchObject({
          status: 'not_installed',
        });
      });

      it('should be installing when package SO install_status is installing', async () => {
        const soClient = savedObjectsClientMock.create();
        soClient.get.mockResolvedValue({
          id: 'my-package',
          type: PACKAGES_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            install_status: 'installing',
          },
        });

        expect(
          await getPackageInfo({
            savedObjectsClient: soClient,
            pkgName: 'my-package',
            pkgVersion: '1.0.0',
          })
        ).toMatchObject({
          status: 'installing',
        });
      });

      it('should be installed when package SO install_status is installed', async () => {
        const soClient = savedObjectsClientMock.create();
        soClient.get.mockResolvedValue({
          id: 'my-package',
          type: PACKAGES_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            install_status: 'installed',
          },
        });

        expect(
          await getPackageInfo({
            savedObjectsClient: soClient,
            pkgName: 'my-package',
            pkgVersion: '1.0.0',
          })
        ).toMatchObject({
          status: 'installed',
        });
      });

      it('should be install_failed when package SO install_status is install_failed', async () => {
        const soClient = savedObjectsClientMock.create();
        soClient.get.mockResolvedValue({
          id: 'my-package',
          type: PACKAGES_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            install_status: 'install_failed',
          },
        });

        expect(
          await getPackageInfo({
            savedObjectsClient: soClient,
            pkgName: 'my-package',
            pkgVersion: '1.0.0',
          })
        ).toMatchObject({
          status: 'install_failed',
        });
      });
    });

    describe('registry fetch errors', () => {
      it('throws when a package that is not installed is not available in the registry and not bundled', async () => {
        MockRegistry.fetchFindLatestPackageOrUndefined.mockResolvedValue(undefined);
        const soClient = savedObjectsClientMock.create();
        soClient.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());

        await expect(
          getPackageInfo({
            savedObjectsClient: soClient,
            pkgName: 'my-package',
            pkgVersion: '1.0.0',
          })
        ).rejects.toThrowError(PackageNotFoundError);
      });

      it('sets the latestVersion to installed version when an installed package is not available in the registry', async () => {
        MockRegistry.fetchFindLatestPackageOrUndefined.mockResolvedValue(undefined);
        const soClient = savedObjectsClientMock.create();
        soClient.get.mockResolvedValue({
          id: 'my-package',
          type: PACKAGES_SAVED_OBJECT_TYPE,
          references: [],
          attributes: {
            install_status: 'installed',
          },
        });

        await expect(
          getPackageInfo({
            savedObjectsClient: soClient,
            pkgName: 'my-package',
            pkgVersion: '1.0.0',
          })
        ).resolves.toMatchObject({
          latestVersion: '1.0.0',
          status: 'installed',
        });
      });
    });
  });
});
