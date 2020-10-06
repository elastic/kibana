/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchAssetType, Installation, KibanaAssetType } from '../../../types';
import { SavedObject, SavedObjectsClientContract } from 'src/core/server';

jest.mock('./install');

import { savedObjectsClientMock } from 'src/core/server/mocks';
import { appContextService } from '../../app_context';
import { createAppContextStartContractMock } from '../../../mocks';
import { handleInstallPackageFailure, installPackageFromRegistry } from './install';
import { upgradePackage } from './upgrade';
import { RegistryResponseError } from '../../../errors';

// if we add this assertion, TS will type check the return value
// and the editor will also know about .mockImplementation, .mock.calls, etc
const mockedInstallPackageFromRegistry = installPackageFromRegistry as jest.MockedFunction<
  typeof installPackageFromRegistry
>;
const mockedHandleInstallPackageFailure = handleInstallPackageFailure as jest.MockedFunction<
  typeof handleInstallPackageFailure
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

describe('upgradePackage', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  beforeEach(async () => {
    soClient = savedObjectsClientMock.create();
    appContextService.start(createAppContextStartContractMock());
  });
  afterEach(async () => {
    appContextService.stop();
  });
  it('should return a BulkInstallPackageInfo objects when successful', async () => {
    mockedInstallPackageFromRegistry.mockImplementation(async () => {
      return [];
    });
    const latestPkg = {
      name: mockInstallation.attributes.name,
      version: '1.0.1',
      description: '',
      type: '',
      download: '',
      path: '',
    };
    const resp = await upgradePackage({
      savedObjectsClient: soClient,
      callCluster: jest.fn(),
      installedPkg: mockInstallation,
      latestPkg,
      pkgToUpgrade: mockInstallation.attributes.name,
    });
    expect(resp).toEqual({
      name: mockInstallation.attributes.name,
      newVersion: latestPkg.version,
      oldVersion: mockInstallation.attributes.version,
      assets: [],
    });
  });
  it('should not do an upgrade if a newer package version does not exist', async () => {
    const latestPkg = {
      name: mockInstallation.attributes.name,
      version: '1.0.0',
      description: '',
      type: '',
      download: '',
      path: '',
    };
    const resp = await upgradePackage({
      savedObjectsClient: soClient,
      callCluster: jest.fn(),
      installedPkg: mockInstallation,
      latestPkg,
      pkgToUpgrade: mockInstallation.attributes.name,
    });
    expect(resp).toEqual({
      name: mockInstallation.attributes.name,
      newVersion: latestPkg.version,
      oldVersion: mockInstallation.attributes.version,
      assets: [
        ...mockInstallation.attributes.installed_es,
        ...mockInstallation.attributes.installed_kibana,
      ],
    });
  });
  it('should return a non critical error if rollback succeeds', async () => {
    const installError = new Error('install');
    mockedInstallPackageFromRegistry.mockImplementation(async () => {
      throw installError;
    });
    mockedHandleInstallPackageFailure.mockImplementation(async () => {
      return undefined;
    });
    const latestPkg = {
      name: mockInstallation.attributes.name,
      version: '1.0.1',
      description: '',
      type: '',
      download: '',
      path: '',
    };
    const resp = await upgradePackage({
      savedObjectsClient: soClient,
      callCluster: jest.fn(),
      installedPkg: mockInstallation,
      latestPkg,
      pkgToUpgrade: mockInstallation.attributes.name,
    });
    expect(resp).toEqual({
      name: mockInstallation.attributes.name,
      error: installError,
      criticalFailure: false,
    });
  });
  it('should return a non critical error if an upgrade encountered a registry error', async () => {
    const installError = new RegistryResponseError('install');
    mockedInstallPackageFromRegistry.mockImplementation(async () => {
      throw installError;
    });
    const { handleInstallPackageFailure: actualHandleInstallPackageFailure } = jest.requireActual(
      './install'
    );
    // make sure the actual implementation ignores IngestManager error types
    mockedHandleInstallPackageFailure.mockImplementation(actualHandleInstallPackageFailure);
    const latestPkg = {
      name: mockInstallation.attributes.name,
      version: '1.0.1',
      description: '',
      type: '',
      download: '',
      path: '',
    };
    const resp = await upgradePackage({
      savedObjectsClient: soClient,
      callCluster: jest.fn(),
      installedPkg: mockInstallation,
      latestPkg,
      pkgToUpgrade: mockInstallation.attributes.name,
    });
    expect(resp).toEqual({
      name: mockInstallation.attributes.name,
      error: installError,
      criticalFailure: false,
    });
  });
  it('should return a critical error if rollback fails', async () => {
    const installError = new Error('install');
    mockedInstallPackageFromRegistry.mockImplementation(async () => {
      throw installError;
    });
    mockedHandleInstallPackageFailure.mockImplementation(async () => {
      return new Error('rollback');
    });
    const latestPkg = {
      name: mockInstallation.attributes.name,
      version: '1.0.1',
      description: '',
      type: '',
      download: '',
      path: '',
    };
    const resp = await upgradePackage({
      savedObjectsClient: soClient,
      callCluster: jest.fn(),
      installedPkg: mockInstallation,
      latestPkg,
      pkgToUpgrade: mockInstallation.attributes.name,
    });
    expect(resp).toEqual({
      name: mockInstallation.attributes.name,
      error: installError,
      criticalFailure: true,
    });
  });
  it('should return a critical error if an install failed', async () => {
    const installError = new Error('install');
    mockedInstallPackageFromRegistry.mockImplementation(async () => {
      throw installError;
    });
    mockedHandleInstallPackageFailure.mockImplementation(async () => {
      return undefined;
    });
    const latestPkg = {
      name: mockInstallation.attributes.name,
      version: '1.0.1',
      description: '',
      type: '',
      download: '',
      path: '',
    };
    const resp = await upgradePackage({
      savedObjectsClient: soClient,
      callCluster: jest.fn(),
      // passing undefined here means the package wasn't already installed so
      // it will be treated as an install instead of an upgrade
      installedPkg: undefined,
      latestPkg,
      pkgToUpgrade: mockInstallation.attributes.name,
    });
    expect(resp).toEqual({
      name: mockInstallation.attributes.name,
      error: installError,
      criticalFailure: true,
    });
  });
  it('should return a critical error if an install failed and if rollback fails', async () => {
    const installError = new Error('install');
    mockedInstallPackageFromRegistry.mockImplementation(async () => {
      throw installError;
    });
    mockedHandleInstallPackageFailure.mockImplementation(async () => {
      return undefined;
    });
    const latestPkg = {
      name: mockInstallation.attributes.name,
      version: '1.0.1',
      description: '',
      type: '',
      download: '',
      path: '',
    };
    const resp = await upgradePackage({
      savedObjectsClient: soClient,
      callCluster: jest.fn(),
      // passing undefined here means the package wasn't already installed so
      // it will be treated as an install instead of an upgrade
      installedPkg: undefined,
      latestPkg,
      pkgToUpgrade: mockInstallation.attributes.name,
    });
    expect(resp).toEqual({
      name: mockInstallation.attributes.name,
      error: installError,
      criticalFailure: true,
    });
  });
});
