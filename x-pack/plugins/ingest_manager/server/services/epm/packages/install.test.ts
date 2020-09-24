/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchAssetType, Installation, KibanaAssetType } from '../../../types';
import { SavedObject } from 'src/core/server';
jest.mock('./install', () => ({
  ...(jest.requireActual('./install') as {}),
  bulkInstallPackages: jest.fn(async () => {
    return [
      {
        name: 'blah',
        assets: [],
        newVersion: '',
        oldVersion: '',
        statusCode: 200,
      },
    ];
  }),
}));

jest.mock('./get', () => ({
  ...(jest.requireActual('./get') as {}),
  getInstallation: jest.fn(async () => {
    return mockInstallation.attributes;
  }),
}));
import { getInstallType, ensureInstalledDefaultPackages } from './install';

import { savedObjectsClientMock } from 'src/core/server/mocks';
import { appContextService } from '../../app_context';
import { createAppContextStartContractMock } from '../../../mocks';

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
const mockInstallationUpdateFail: SavedObject<Installation> = {
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
    install_status: 'installing',
    install_version: '1.0.1',
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
      const soClient = savedObjectsClientMock.create();
      const resp = await ensureInstalledDefaultPackages(soClient, jest.fn());
      expect(resp).toEqual([mockInstallation.attributes]);
    });
  });
  describe('getInstallType', () => {
    it('should return correct type when installing and no other version is currently installed', () => {
      const installTypeInstall = getInstallType({ pkgVersion: '1.0.0', installedPkg: undefined });
      expect(installTypeInstall).toBe('install');

      // @ts-expect-error can only be 'install' if no installedPkg given
      expect(installTypeInstall === 'update').toBe(false);
      // @ts-expect-error can only be 'install' if no installedPkg given
      expect(installTypeInstall === 'reinstall').toBe(false);
      // @ts-expect-error can only be 'install' if no installedPkg given
      expect(installTypeInstall === 'reupdate').toBe(false);
      // @ts-expect-error can only be 'install' if no installedPkg given
      expect(installTypeInstall === 'rollback').toBe(false);
    });

    it('should return correct type when installing the same version', () => {
      const installTypeReinstall = getInstallType({
        pkgVersion: '1.0.0',
        installedPkg: mockInstallation,
      });
      expect(installTypeReinstall).toBe('reinstall');

      // @ts-expect-error cannot be 'install' if given installedPkg
      expect(installTypeReinstall === 'install').toBe(false);
    });

    it('should return correct type when moving from one version to another', () => {
      const installTypeUpdate = getInstallType({
        pkgVersion: '1.0.1',
        installedPkg: mockInstallation,
      });
      expect(installTypeUpdate).toBe('update');

      // @ts-expect-error cannot be 'install' if given installedPkg
      expect(installTypeUpdate === 'install').toBe(false);
    });

    it('should return correct type when update fails and trys again', () => {
      const installTypeReupdate = getInstallType({
        pkgVersion: '1.0.1',
        installedPkg: mockInstallationUpdateFail,
      });
      expect(installTypeReupdate).toBe('reupdate');

      // @ts-expect-error cannot be 'install' if given installedPkg
      expect(installTypeReupdate === 'install').toBe(false);
    });

    it('should return correct type when attempting to rollback from a failed update', () => {
      const installTypeRollback = getInstallType({
        pkgVersion: '1.0.0',
        installedPkg: mockInstallationUpdateFail,
      });
      expect(installTypeRollback).toBe('rollback');

      // @ts-expect-error cannot be 'install' if given installedPkg
      expect(installTypeRollback === 'install').toBe(false);
    });
  });
});
