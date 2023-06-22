/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsAssetReference } from '../../common/types';
import type { PackageInfo } from '../types';

import { ElasticsearchAssetType } from '../../common/types';

import { hasDeferredInstallations } from './has_deferred_installations';

import { ExperimentalFeaturesService } from '.';

const mockGet = jest.spyOn(ExperimentalFeaturesService, 'get');

const createPackage = ({
  installedEs = [],
}: {
  installedEs?: EsAssetReference[];
} = {}): PackageInfo => ({
  name: 'test-package',
  description: 'Test Package',
  title: 'Test Package',
  version: '0.0.1',
  latestVersion: '0.0.1',
  release: 'experimental',
  format_version: '1.0.0',
  owner: { github: 'elastic/fleet' },
  policy_templates: [],
  // @ts-ignore
  assets: {},
  savedObject: {
    id: '1234',
    type: 'epm-package',
    references: [],
    attributes: {
      installed_kibana: [],
      installed_es: installedEs ?? [],
      es_index_patterns: {},
      name: 'test-package',
      version: '0.0.1',
      install_status: 'installed',
      install_version: '0.0.1',
      install_started_at: new Date().toString(),
      install_source: 'registry',
      verification_status: 'verified',
      verification_key_id: '',
    },
  },
});

describe('isPackageUnverified', () => {
  describe('When experimental feature is disabled', () => {
    beforeEach(() => {
      // @ts-ignore don't want to define all experimental features here
      mockGet.mockReturnValue({
        packageVerification: false,
      } as ReturnType<typeof ExperimentalFeaturesService['get']>);
    });

    it('Should return false for a package with no saved object', () => {
      const noSoPkg = createPackage();
      // @ts-ignore we know pkg has savedObject but ts doesn't
      delete noSoPkg.savedObject;
      expect(hasDeferredInstallations(noSoPkg)).toEqual(false);
    });

    it('Should return true for a package with at least one asset deferred', () => {
      const pkgWithDeferredInstallations = createPackage({
        installedEs: [
          { id: '', type: ElasticsearchAssetType.ingestPipeline },
          { id: '', type: ElasticsearchAssetType.transform, deferred: true },
        ],
      });
      // @ts-ignore we know pkg has savedObject but ts doesn't
      expect(hasDeferredInstallations(pkgWithDeferredInstallations)).toEqual(true);
    });

    it('Should return false for a package that has no asset deferred', () => {
      const pkgWithoutDeferredInstallations = createPackage({
        installedEs: [
          { id: '', type: ElasticsearchAssetType.ingestPipeline },
          { id: '', type: ElasticsearchAssetType.transform, deferred: false },
        ],
      });
      expect(hasDeferredInstallations(pkgWithoutDeferredInstallations)).toEqual(false);
    });

    it('Should return false for a package that has no asset', () => {
      const pkgWithoutDeferredInstallations = createPackage({
        installedEs: [],
      });
      expect(hasDeferredInstallations(pkgWithoutDeferredInstallations)).toEqual(false);
    });
  });
});
