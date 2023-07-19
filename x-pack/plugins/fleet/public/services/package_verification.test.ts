/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageVerificationStatus } from '../../common/types';
import type { PackageInfo } from '../types';

import { ExperimentalFeaturesService, isPackageUnverified } from '.';

const mockGet = jest.spyOn(ExperimentalFeaturesService, 'get');

const createPackage = ({
  verificationStatus = 'unknown',
  verificationKeyId,
}: {
  verificationStatus?: PackageVerificationStatus;
  verificationKeyId?: string;
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
  installationInfo: {
    type: 'epm-package',
    installed_kibana: [],
    installed_es: [],
    name: 'test-package',
    version: '0.0.1',
    install_status: 'installed',
    install_source: 'registry',
    verification_status: verificationStatus,
    ...(verificationKeyId && { verification_key_id: verificationKeyId }),
  },
});

describe('isPackageUnverified', () => {
  describe('When experimental feature is disabled', () => {
    beforeEach(() => {
      // @ts-ignore don't want to define all experimental features here
      mockGet.mockReturnValue({
        packageVerification: false,
      } as ReturnType<(typeof ExperimentalFeaturesService)['get']>);
    });

    it('Should return false for a package with no saved object', () => {
      const noSoPkg = createPackage();
      // @ts-ignore we know pkg has installationInfo but ts doesn't
      delete noSoPkg.installationInfo;
      expect(isPackageUnverified(noSoPkg)).toEqual(false);
    });
    it('Should return false for an unverified package', () => {
      const unverifiedPkg = createPackage({ verificationStatus: 'unverified' });
      expect(isPackageUnverified(unverifiedPkg)).toEqual(false);
    });
    it('Should return false for a verified package', () => {
      const verifiedPkg = createPackage({ verificationStatus: 'verified' });
      expect(isPackageUnverified(verifiedPkg)).toEqual(false);
    });
    it('Should return false for a verified package with correct key', () => {
      const unverifiedPkg = createPackage({
        verificationStatus: 'verified',
        verificationKeyId: '1234',
      });
      expect(isPackageUnverified(unverifiedPkg, '1234')).toEqual(false);
    });
    it('Should return false for a verified package with out of date key', () => {
      const unverifiedPkg = createPackage({
        verificationStatus: 'verified',
        verificationKeyId: '1234',
      });
      expect(isPackageUnverified(unverifiedPkg, 'not_1234')).toEqual(false);
    });
    it('Should return false for an unknown verification package', () => {
      const unknownPkg = createPackage({ verificationStatus: 'unknown' });
      expect(isPackageUnverified(unknownPkg)).toEqual(false);
    });
  });
  describe('When experimental feature is enabled', () => {
    beforeEach(() => {
      mockGet.mockReturnValue({
        packageVerification: true,
      } as ReturnType<(typeof ExperimentalFeaturesService)['get']>);
    });
    it('Should return false for a package with no saved object', () => {
      const noSoPkg = createPackage();
      // @ts-ignore we know pkg has installationInfo but ts doesn't
      delete noSoPkg.installationInfo;
      expect(isPackageUnverified(noSoPkg)).toEqual(false);
    });
    it('Should return false for a verified package', () => {
      const unverifiedPkg = createPackage({ verificationStatus: 'verified' });
      expect(isPackageUnverified(unverifiedPkg)).toEqual(false);
    });
    it('Should return false for an unknown verification package', () => {
      const unverifiedPkg = createPackage({ verificationStatus: 'unknown' });
      expect(isPackageUnverified(unverifiedPkg)).toEqual(false);
    });
    it('Should return false for a verified package with correct key', () => {
      const unverifiedPkg = createPackage({
        verificationStatus: 'verified',
        verificationKeyId: '1234',
      });
      expect(isPackageUnverified(unverifiedPkg, '1234')).toEqual(false);
    });

    it('Should return true for an unverified package', () => {
      const unverifiedPkg = createPackage({ verificationStatus: 'unverified' });
      expect(isPackageUnverified(unverifiedPkg)).toEqual(true);
    });

    it('Should return true for a verified package with out of date key', () => {
      const unverifiedPkg = createPackage({
        verificationStatus: 'verified',
        verificationKeyId: '1234',
      });
      expect(isPackageUnverified(unverifiedPkg, 'not_1234')).toEqual(true);
    });
  });
});
