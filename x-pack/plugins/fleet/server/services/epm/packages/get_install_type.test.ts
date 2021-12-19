/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from 'src/core/server';

import { ElasticsearchAssetType, KibanaSavedObjectType } from '../../../types';
import type { Installation } from '../../../types';

import { getInstallType } from './install';

const mockInstallation: SavedObject<Installation> = {
  id: 'test-pkg',
  references: [],
  type: 'epm-packages',
  attributes: {
    id: 'test-pkg',
    installed_kibana_space_id: 'default',
    installed_kibana: [{ type: KibanaSavedObjectType.dashboard, id: 'dashboard-1' }],
    installed_es: [{ type: ElasticsearchAssetType.ingestPipeline, id: 'pipeline' }],
    package_assets: [],
    es_index_patterns: { pattern: 'pattern-name' },
    name: 'test packagek',
    version: '1.0.0',
    install_status: 'installed',
    install_version: '1.0.0',
    install_started_at: new Date().toISOString(),
    install_source: 'registry',
    keep_policies_up_to_date: false,
  },
};
const mockInstallationUpdateFail: SavedObject<Installation> = {
  id: 'test-pkg',
  references: [],
  type: 'epm-packages',
  attributes: {
    id: 'test-pkg',
    installed_kibana_space_id: 'default',
    installed_kibana: [{ type: KibanaSavedObjectType.dashboard, id: 'dashboard-1' }],
    installed_es: [{ type: ElasticsearchAssetType.ingestPipeline, id: 'pipeline' }],
    package_assets: [],
    es_index_patterns: { pattern: 'pattern-name' },
    name: 'test packagek',
    version: '1.0.0',
    install_status: 'installing',
    install_version: '1.0.1',
    install_started_at: new Date().toISOString(),
    install_source: 'registry',
    keep_policies_up_to_date: false,
  },
};

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
