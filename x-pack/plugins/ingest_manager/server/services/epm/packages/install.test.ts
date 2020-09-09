/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchAssetType, Installation, KibanaAssetType } from '../../../types';
import { SavedObject } from 'src/core/server';
import { getInstallType } from './install';

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
  describe('getInstallType', () => {
    it('should return correct type when installing and no other version is currently installed', () => {});
    const installTypeInstall = getInstallType({ pkgVersion: '1.0.0', installedPkg: undefined });
    expect(installTypeInstall).toBe('install');

    it('should return correct type when installing the same version', () => {});
    const installTypeReinstall = getInstallType({
      pkgVersion: '1.0.0',
      installedPkg: mockInstallation,
    });
    expect(installTypeReinstall).toBe('reinstall');

    it('should return correct type when moving from one version to another', () => {});
    const installTypeUpdate = getInstallType({
      pkgVersion: '1.0.1',
      installedPkg: mockInstallation,
    });
    expect(installTypeUpdate).toBe('update');

    it('should return correct type when update fails and trys again', () => {});
    const installTypeReupdate = getInstallType({
      pkgVersion: '1.0.1',
      installedPkg: mockInstallationUpdateFail,
    });
    expect(installTypeReupdate).toBe('reupdate');

    it('should return correct type when attempting to rollback from a failed update', () => {});
    const installTypeRollback = getInstallType({
      pkgVersion: '1.0.0',
      installedPkg: mockInstallationUpdateFail,
    });
    expect(installTypeRollback).toBe('rollback');
  });
});
