/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchAssetType, Installation, KibanaAssetType } from '../../../types';
import { BulkInstallPackagesError } from '../../../errors';
import { SavedObject } from 'src/core/server';

jest.mock('./install');
jest.mock('./bulk_install_packages');
jest.mock('./get', () => ({
  ...(jest.requireActual('./get') as {}),
  getInstallation: jest.fn(async () => {
    return mockInstallation.attributes;
  }),
}));
import { bulkInstallPackages } from './bulk_install_packages';
const { ensureInstalledDefaultPackages } = jest.requireActual('./install');
import { savedObjectsClientMock } from 'src/core/server/mocks';
import { appContextService } from '../../app_context';
import { createAppContextStartContractMock } from '../../../mocks';

// if we add this assertion, TS will type check the return value
// and the editor will also know about .mockImplementation, .mock.calls, etc
const mockedBulkInstallPackages = bulkInstallPackages as jest.MockedFunction<
  typeof bulkInstallPackages
>;

const mockInstallation: SavedObject<Installation> = {
  id: 'test-pkg',
  references: [],
  type: 'epm-packages',
  attributes: {
    id: 'test-pkg',
    installed_kibana: [{ type: KibanaAssetType.dashboard, id: 'dashboard-1' }],
    installed_es: [{ type: ElasticsearchAssetType.ingestPipeline, id: 'pipeline' }],
    es_index_patterns: { pattern: 'pattern-name' },
    name: 'test packagek',
    version: '1.0.0',
    install_status: 'installed',
    install_version: '1.0.0',
    install_started_at: new Date().toISOString(),
  },
};

describe('install', () => {
  describe('ensureInstalledDefaultPackages', () => {
    beforeEach(async () => {
      appContextService.start(createAppContextStartContractMock());
    });
    afterEach(async () => {
      appContextService.stop();
    });
    it('should return an array of Installation objects when successful', async () => {
      mockedBulkInstallPackages.mockImplementationOnce(async function () {
        return [
          {
            name: 'blah',
            assets: [],
            newVersion: '',
            oldVersion: '',
            statusCode: 200,
          },
        ];
      });
      const soClient = savedObjectsClientMock.create();
      const resp = await ensureInstalledDefaultPackages(soClient, jest.fn());
      expect(resp).toEqual([mockInstallation.attributes]);
    });
    it('should throw an error of the first IBulkInstallPackageError it finds', async () => {
      mockedBulkInstallPackages.mockImplementationOnce(async function () {
        return [
          {
            name: 'success one',
            assets: [],
            newVersion: '',
            oldVersion: '',
            statusCode: 200,
          },
          {
            name: 'success two',
            assets: [],
            newVersion: '',
            oldVersion: '',
            statusCode: 200,
          },
          {
            name: 'failure one',
            error: new BulkInstallPackagesError('abc 123'),
          },
          {
            name: 'success three',
            assets: [],
            newVersion: '',
            oldVersion: '',
            statusCode: 200,
          },
          {
            name: 'failure two',
            error: new BulkInstallPackagesError('zzz'),
          },
        ];
      });
      const soClient = savedObjectsClientMock.create();
      const installPromise = ensureInstalledDefaultPackages(soClient, jest.fn());
      expect(installPromise).rejects.toThrow(BulkInstallPackagesError);
      expect(installPromise).rejects.toThrow('abc 123');
    });
  });
});
