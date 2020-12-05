/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchAssetType, Installation, KibanaSavedObjectType } from '../../../types';
import { SavedObject, SavedObjectsClientContract } from 'src/core/server';

jest.mock('./install');
jest.mock('./bulk_install_packages');
jest.mock('./get');

import { bulkInstallPackages, isBulkInstallError } from './bulk_install_packages';
const { ensureInstalledDefaultPackages } = jest.requireActual('./install');
const { isBulkInstallError: actualIsBulkInstallError } = jest.requireActual(
  './bulk_install_packages'
);
import { getInstallation } from './get';
import { savedObjectsClientMock } from 'src/core/server/mocks';
import { appContextService } from '../../app_context';
import { createAppContextStartContractMock } from '../../../mocks';

// if we add this assertion, TS will type check the return value
// and the editor will also know about .mockImplementation, .mock.calls, etc
const mockedBulkInstallPackages = bulkInstallPackages as jest.MockedFunction<
  typeof bulkInstallPackages
>;
const mockedIsBulkInstallError = isBulkInstallError as jest.MockedFunction<
  typeof isBulkInstallError
>;
const mockedGetInstallation = getInstallation as jest.MockedFunction<typeof getInstallation>;

// I was unable to get the actual implementation set in the `jest.mock()` call at the top to work
// so this will set the `isBulkInstallError` function back to the actual implementation
mockedIsBulkInstallError.mockImplementation(actualIsBulkInstallError);

const mockInstallation: SavedObject<Installation> = {
  id: 'test-pkg',
  references: [],
  type: 'epm-packages',
  attributes: {
    id: 'test-pkg',
    installed_kibana: [{ type: KibanaSavedObjectType.dashboard, id: 'dashboard-1' }],
    installed_es: [{ type: ElasticsearchAssetType.ingestPipeline, id: 'pipeline' }],
    es_index_patterns: { pattern: 'pattern-name' },
    name: 'test package',
    version: '1.0.0',
    install_status: 'installed',
    install_version: '1.0.0',
    install_started_at: new Date().toISOString(),
    install_source: 'registry',
  },
};

describe('ensureInstalledDefaultPackages', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  beforeEach(async () => {
    soClient = savedObjectsClientMock.create();
    appContextService.start(createAppContextStartContractMock());
  });
  afterEach(async () => {
    appContextService.stop();
  });
  it('should return an array of Installation objects when successful', async () => {
    mockedGetInstallation.mockImplementation(async () => {
      return mockInstallation.attributes;
    });
    mockedBulkInstallPackages.mockImplementationOnce(async function () {
      return [
        {
          name: mockInstallation.attributes.name,
          assets: [],
          newVersion: '',
          oldVersion: '',
          statusCode: 200,
        },
      ];
    });
    const resp = await ensureInstalledDefaultPackages(soClient, jest.fn());
    expect(resp).toEqual([mockInstallation.attributes]);
  });
  it('should throw the first Error it finds', async () => {
    class SomeCustomError extends Error {}
    mockedGetInstallation.mockImplementation(async () => {
      return mockInstallation.attributes;
    });
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
          error: new SomeCustomError('abc 123'),
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
          error: new Error('zzz'),
        },
      ];
    });
    const installPromise = ensureInstalledDefaultPackages(soClient, jest.fn());
    expect.assertions(2);
    expect(installPromise).rejects.toThrow(SomeCustomError);
    expect(installPromise).rejects.toThrow('abc 123');
  });
  it('should throw an error when get installation returns undefined', async () => {
    mockedGetInstallation.mockImplementation(async () => {
      return undefined;
    });
    mockedBulkInstallPackages.mockImplementationOnce(async function () {
      return [
        {
          name: 'undefined package',
          assets: [],
          newVersion: '',
          oldVersion: '',
          statusCode: 200,
        },
      ];
    });
    const installPromise = ensureInstalledDefaultPackages(soClient, jest.fn());
    expect.assertions(1);
    expect(installPromise).rejects.toThrow();
  });
});
