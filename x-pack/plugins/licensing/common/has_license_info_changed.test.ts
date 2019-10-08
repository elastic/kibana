/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { bufferCount, take, skip } from 'rxjs/operators';
// import { ILicense } from './types';
import { License } from './license';
import { hasLicenseInfoChanged } from './has_license_info_changed';
// import { licenseMerge } from './license_merge';

function license({ error, ...rawLicense }: { error?: Error; [key: string]: any } = {}) {
  return new License({
    plugin: { sign: x => x.toString() },
    error,
    license: Object.keys(rawLicense).length ? rawLicense : undefined,
  });
}

// Each test should ensure that left-to-right and right-to-left comparisons are captured.

describe('has license info changed', () => {
  describe('undefined', () => {
    test('undefined <-> undefined', async () => {
      expect(hasLicenseInfoChanged(undefined, undefined)).toBe(false);
    });

    test('undefined <-> License', async () => {
      expect(hasLicenseInfoChanged(undefined, license())).toBe(true);
      expect(hasLicenseInfoChanged(license(), undefined)).toBe(true);
    });
  });

  describe('License', () => {
    test('License <-> available License', async () => {
      expect(hasLicenseInfoChanged(license(), license({ uid: 'alpha' }))).toBe(true);
      expect(hasLicenseInfoChanged(license(), license({ uid: 'alpha' }))).toBe(true);
    });

    test('uid License <-> uid License', async () => {
      expect(hasLicenseInfoChanged(license({ uid: 'alpha' }), license({ uid: 'alpha' }))).toBe(
        false
      );
      expect(hasLicenseInfoChanged(license({ uid: 'alpha' }), license({ uid: 'beta' }))).toBe(
        false
      );
      expect(hasLicenseInfoChanged(license({ uid: 'beta' }), license({ uid: 'alpha' }))).toBe(
        false
      );
    });

    test('License <-> type License', async () => {
      expect(hasLicenseInfoChanged(license({ type: 'basic' }), license())).toBe(true);
      expect(hasLicenseInfoChanged(license(), license({ type: 'basic' }))).toBe(true);
    });

    test('type License <-> type License | mismatched type', async () => {
      expect(hasLicenseInfoChanged(license({ type: 'basic' }), license({ type: 'gold' }))).toBe(
        true
      );
      expect(hasLicenseInfoChanged(license({ type: 'gold' }), license({ type: 'basic' }))).toBe(
        true
      );
    });

    test('License <-> status License', async () => {
      expect(hasLicenseInfoChanged(license({ status: 'active' }), license())).toBe(true);
      expect(hasLicenseInfoChanged(license(), license({ status: 'active' }))).toBe(true);
    });

    test('status License <-> status License | mismatched status', async () => {
      expect(
        hasLicenseInfoChanged(license({ status: 'active' }), license({ status: 'inactive' }))
      ).toBe(true);
      expect(
        hasLicenseInfoChanged(license({ status: 'inactive' }), license({ status: 'active' }))
      ).toBe(true);
    });

    test('License <-> expiry License', async () => {
      expect(hasLicenseInfoChanged(license({ expiry_date_in_millis: 100 }), license())).toBe(true);
      expect(hasLicenseInfoChanged(license(), license({ expiry_date_in_millis: 100 }))).toBe(true);
    });

    test('expiry License <-> expiry License | mismatched expiry', async () => {
      expect(
        hasLicenseInfoChanged(
          license({ expiry_date_in_millis: 100 }),
          license({ expiry_date_in_millis: 200 })
        )
      ).toBe(true);
      expect(
        hasLicenseInfoChanged(
          license({ expiry_date_in_millis: 200 }),
          license({ expiry_date_in_millis: 100 })
        )
      ).toBe(true);
    });
  });

  describe('error License', () => {
    test('License <-> error License', async () => {
      expect(hasLicenseInfoChanged(license({ error: new Error('alpha') }), license())).toBe(true);
      expect(hasLicenseInfoChanged(license(), license({ error: new Error('alpha') }))).toBe(true);
    });

    test('error License <-> error License | matched messages', async () => {
      expect(
        hasLicenseInfoChanged(
          license({ error: new Error('alpha') }),
          license({ error: new Error('alpha') })
        )
      ).toBe(false);
    });

    test('error License <-> error License | mismatched messages', async () => {
      expect(
        hasLicenseInfoChanged(
          license({ error: new Error('alpha') }),
          license({ error: new Error('beta') })
        )
      ).toBe(true);
      expect(
        hasLicenseInfoChanged(
          license({ error: new Error('beta') }),
          license({ error: new Error('alpha') })
        )
      ).toBe(true);
    });
  });
});
