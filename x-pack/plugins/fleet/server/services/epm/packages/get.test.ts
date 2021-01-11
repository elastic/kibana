/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, SavedObjectsFindResult } from 'kibana/server';
import { savedObjectsClientMock } from '../../../../../../../src/core/server/mocks';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, PackagePolicySOAttributes } from '../../../../common';
import { getPackageUsageStats } from './get';

describe('When using EPM `get` services', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
  });

  describe('and invoking getPackageUsageStats()', () => {
    beforeEach(() => {
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
});
