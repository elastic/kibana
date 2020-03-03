/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { License } from './license';
import { PublicLicense } from './types';
import { hasLicenseInfoChanged } from './has_license_info_changed';

function license({ error, ...customLicense }: { error?: string; [key: string]: any } = {}) {
  const defaultLicense: PublicLicense = {
    uid: 'uid-000000001234',
    status: 'active',
    type: 'basic',
    mode: 'basic',
    expiryDateInMillis: 1000,
  };

  return new License({
    error,
    license: Object.assign(defaultLicense, customLicense),
    signature: 'aaaaaaa',
  });
}

// Each test should ensure that left-to-right and right-to-left comparisons are captured.
describe('has license info changed', () => {
  describe('License', () => {
    test('undefined <-> License', async () => {
      expect(hasLicenseInfoChanged(undefined, license())).toBe(true);
    });

    test('the same License', async () => {
      const licenseInstance = license();
      expect(hasLicenseInfoChanged(licenseInstance, licenseInstance)).toBe(false);
    });

    test('type License <-> type License | mismatched type', async () => {
      expect(hasLicenseInfoChanged(license({ type: 'basic' }), license({ type: 'gold' }))).toBe(
        true
      );
      expect(hasLicenseInfoChanged(license({ type: 'gold' }), license({ type: 'basic' }))).toBe(
        true
      );
    });

    test('status License <-> status License | mismatched status', async () => {
      expect(
        hasLicenseInfoChanged(license({ status: 'active' }), license({ status: 'inactive' }))
      ).toBe(true);
      expect(
        hasLicenseInfoChanged(license({ status: 'inactive' }), license({ status: 'active' }))
      ).toBe(true);
    });

    test('expiry License <-> expiry License | mismatched expiry', async () => {
      expect(
        hasLicenseInfoChanged(
          license({ expiryDateInMillis: 100 }),
          license({ expiryDateInMillis: 200 })
        )
      ).toBe(true);
      expect(
        hasLicenseInfoChanged(
          license({ expiryDateInMillis: 200 }),
          license({ expiryDateInMillis: 100 })
        )
      ).toBe(true);
    });
  });

  describe('error License', () => {
    test('License <-> error License', async () => {
      expect(hasLicenseInfoChanged(license({ error: 'reason' }), license())).toBe(true);
      expect(hasLicenseInfoChanged(license(), license({ error: 'reason' }))).toBe(true);
    });

    test('error License <-> error License | matched messages', async () => {
      expect(
        hasLicenseInfoChanged(license({ error: 'reason-1' }), license({ error: 'reason-1' }))
      ).toBe(false);
    });

    test('error License <-> error License | mismatched messages', async () => {
      expect(
        hasLicenseInfoChanged(license({ error: 'reason-1' }), license({ error: 'reason-2' }))
      ).toBe(true);
      expect(
        hasLicenseInfoChanged(license({ error: 'reason-2' }), license({ error: 'reason-1' }))
      ).toBe(true);
    });
  });
});
