/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense } from '@kbn/licensing-plugin/public';

import { hasEnterpriseLicense } from './licensing';

describe('licensing utils', () => {
  const baseLicense: ILicense = {
    isActive: true,
    type: 'trial',
    isAvailable: true,
    signature: 'fake',
    toJSON: jest.fn(),
    getUnavailableReason: jest.fn().mockReturnValue(undefined),
    hasAtLeast: jest.fn().mockReturnValue(false),
    check: jest.fn().mockReturnValue({ state: 'valid' }),
    getFeature: jest.fn().mockReturnValue({ isAvailable: false, isEnabled: false }),
  };
  describe('hasEnterpriseLicense', () => {
    let license: ILicense;
    beforeEach(() => {
      jest.resetAllMocks();
      license = {
        ...baseLicense,
      };
    });
    it('returns true for active enterprise license', () => {
      license.type = 'enterprise';

      expect(hasEnterpriseLicense(license)).toEqual(true);
    });
    it('returns true for active trial license', () => {
      expect(hasEnterpriseLicense(license)).toEqual(true);
    });
    it('returns false for active basic license', () => {
      license.type = 'basic';

      expect(hasEnterpriseLicense(license)).toEqual(false);
    });
    it('returns false for active gold license', () => {
      license.type = 'gold';

      expect(hasEnterpriseLicense(license)).toEqual(false);
    });
    it('returns false for active platinum license', () => {
      license.type = 'platinum';

      expect(hasEnterpriseLicense(license)).toEqual(false);
    });
    it('returns false for inactive enterprise license', () => {
      license.type = 'enterprise';
      license.isActive = false;

      expect(hasEnterpriseLicense(license)).toEqual(false);
    });
    it('returns false for inactive trial license', () => {
      license.isActive = false;

      expect(hasEnterpriseLicense(license)).toEqual(false);
    });
    it('returns false for inactive basic license', () => {
      license.type = 'basic';
      license.isActive = false;

      expect(hasEnterpriseLicense(license)).toEqual(false);
    });
    it('returns false for inactive gold license', () => {
      license.type = 'gold';
      license.isActive = false;

      expect(hasEnterpriseLicense(license)).toEqual(false);
    });
    it('returns false for inactive platinum license', () => {
      license.type = 'platinum';
      license.isActive = false;

      expect(hasEnterpriseLicense(license)).toEqual(false);
    });
    it('returns false for active license is missing type', () => {
      delete license.type;

      expect(hasEnterpriseLicense(license)).toEqual(false);
    });
    it('returns false for null license', () => {
      expect(hasEnterpriseLicense(null)).toEqual(false);
    });
    it('returns false for undefined license', () => {
      expect(hasEnterpriseLicense(undefined)).toEqual(false);
    });
  });
});
