/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchAssetType, Installation, KibanaAssetType } from '../../../types';
import { SavedObject, SavedObjectsClientContract } from 'src/core/server';

jest.mock('./install');
jest.mock('./get');
jest.mock('../registry');
jest.mock('./upgrade');

import { IBulkInstallPackageError, upgradePackage } from './upgrade';
import { getInstallationObject } from './get';
import { savedObjectsClientMock } from 'src/core/server/mocks';
import { appContextService } from '../../app_context';
import { createAppContextStartContractMock } from '../../../mocks';
import { fetchFindLatestPackage } from '../registry';
import { bulkInstallPackages } from './bulk_install_packages';
import { RegistryConnectionError } from '../../../errors';

// if we add this assertion, TS will type check the return value
// and the editor will also know about .mockImplementation, .mock.calls, etc
const mockedUpgradePackage = upgradePackage as jest.MockedFunction<typeof upgradePackage>;
const mockedGetInstallationObject = getInstallationObject as jest.MockedFunction<
  typeof getInstallationObject
>;
const mockedFetchLatestPackage = fetchFindLatestPackage as jest.MockedFunction<
  typeof fetchFindLatestPackage
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
    name: 'test package',
    version: '1.0.0',
    install_status: 'installed',
    install_version: '1.0.0',
    install_started_at: new Date().toISOString(),
    install_source: 'registry',
  },
};

describe('bulkInstallPackages', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  beforeEach(async () => {
    soClient = savedObjectsClientMock.create();
    appContextService.start(createAppContextStartContractMock());
  });
  afterEach(async () => {
    appContextService.stop();
  });
  it('should return an array of BulkInstallPackageInfo objects when successful', async () => {
    mockedGetInstallationObject.mockImplementation(async () => {
      return mockInstallation;
    });
    mockedFetchLatestPackage.mockImplementationOnce(async function () {
      return {
        name: mockInstallation.attributes.name,
        version: '1.0.0',
        description: '',
        type: '',
        download: '',
        path: '',
      };
    });
    const upgradeResponse = {
      name: mockInstallation.attributes.name,
      oldVersion: '',
      newVersion: '',
      assets: [],
    };
    mockedUpgradePackage.mockImplementationOnce(async () => {
      return upgradeResponse;
    });
    const resp = await bulkInstallPackages({
      savedObjectsClient: soClient,
      packagesToUpgrade: ['test-pkg'],
      callCluster: jest.fn(),
    });
    expect(resp).toEqual([upgradeResponse]);
  });
  it('should return an error when the package registry throws an error', async () => {
    mockedGetInstallationObject.mockImplementation(async () => {
      return mockInstallation;
    });
    mockedFetchLatestPackage.mockImplementationOnce(async function () {
      throw new RegistryConnectionError('registry');
    });
    const resp = await bulkInstallPackages({
      savedObjectsClient: soClient,
      packagesToUpgrade: ['test-pkg'],
      callCluster: jest.fn(),
    });
    expect((resp[0] as IBulkInstallPackageError).criticalFailure).toEqual(true);
    expect((resp[0] as IBulkInstallPackageError).error.message).toEqual('registry');
  });
  it('should return an error when it fails to get the installed object', async () => {
    mockedGetInstallationObject.mockImplementation(async () => {
      throw new Error('installation');
    });
    mockedFetchLatestPackage.mockImplementationOnce(async function () {
      return {
        name: mockInstallation.attributes.name,
        version: '1.0.0',
        description: '',
        type: '',
        download: '',
        path: '',
      };
    });
    const resp = await bulkInstallPackages({
      savedObjectsClient: soClient,
      packagesToUpgrade: ['test-pkg'],
      callCluster: jest.fn(),
    });
    expect((resp[0] as IBulkInstallPackageError).criticalFailure).toEqual(true);
    expect((resp[0] as IBulkInstallPackageError).error.message).toEqual('installation');
  });
  it('should return an error when upgradePackage throws an error', async () => {
    mockedGetInstallationObject.mockImplementation(async () => {
      return mockInstallation;
    });
    mockedFetchLatestPackage.mockImplementationOnce(async function () {
      return {
        name: mockInstallation.attributes.name,
        version: '1.0.0',
        description: '',
        type: '',
        download: '',
        path: '',
      };
    });
    mockedUpgradePackage.mockImplementationOnce(async () => {
      throw new Error('upgrade');
    });
    const resp = await bulkInstallPackages({
      savedObjectsClient: soClient,
      packagesToUpgrade: ['test-pkg'],
      callCluster: jest.fn(),
    });
    expect((resp[0] as IBulkInstallPackageError).criticalFailure).toEqual(true);
    expect((resp[0] as IBulkInstallPackageError).error.message).toEqual('upgrade');
  });
});
