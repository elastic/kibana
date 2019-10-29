/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILicense } from './types';
import { Plugin } from './plugin';
import { LICENSE_STATUS } from './constants';
import { LicenseFeature } from './license_feature';
import { setup } from './__fixtures__/setup';

describe('license', () => {
  let plugin: Plugin;
  let license: ILicense;

  afterEach(async () => {
    await plugin.stop();
  });

  test('uid returns a UID field', async () => {
    ({ plugin, license } = await setup());

    expect(license.uid).toBe('00000000-0000-0000-0000-000000000000');
  });

  test('isActive returns true if status is active', async () => {
    ({ plugin, license } = await setup());

    expect(license.isActive).toBe(true);
  });

  test('isActive returns false if status is not active', async () => {
    ({ plugin, license } = await setup({
      license: {
        status: 'aCtIvE', // needs to match exactly
      },
    }));

    expect(license.isActive).toBe(false);
  });

  test('expiryDateInMillis returns expiry_date_in_millis', async () => {
    const expiry = Date.now();

    ({ plugin, license } = await setup({
      license: {
        expiry_date_in_millis: expiry,
      },
    }));

    expect(license.expiryDateInMillis).toBe(expiry);
  });

  test('isOneOf returns true if the type includes one of the license types', async () => {
    ({ plugin, license } = await setup({
      license: {
        type: 'platinum',
      },
    }));

    expect(license.isOneOf('platinum')).toBe(true);
    expect(license.isOneOf(['platinum'])).toBe(true);
    expect(license.isOneOf(['gold', 'platinum'])).toBe(true);
    expect(license.isOneOf(['platinum', 'gold'])).toBe(true);
    expect(license.isOneOf(['basic', 'gold'])).toBe(false);
    expect(license.isOneOf(['basic'])).toBe(false);
  });

  test('type returns the license type', async () => {
    ({ plugin, license } = await setup());

    expect(license.type).toBe('basic');
  });

  test('returns feature API with getFeature', async () => {
    ({ plugin, license } = await setup());

    const security = license.getFeature('security');
    const fake = license.getFeature('fake');

    expect(security).toBeInstanceOf(LicenseFeature);
    expect(fake).toBeInstanceOf(LicenseFeature);
  });

  describe('isActive', () => {
    test('should return Valid if active and check matches', async () => {
      ({ plugin, license } = await setup({
        license: {
          type: 'gold',
        },
      }));

      expect(license.check('test', 'basic').check).toBe(LICENSE_STATUS.Valid);
      expect(license.check('test', 'gold').check).toBe(LICENSE_STATUS.Valid);
    });

    test('should return Invalid if active and check does not match', async () => {
      ({ plugin, license } = await setup());

      const { check } = license.check('test', 'gold');

      expect(check).toBe(LICENSE_STATUS.Invalid);
    });

    test('should return Unavailable if missing license', async () => {
      ({ plugin, license } = await setup({ license: null }));

      const { check } = license.check('test', 'gold');

      expect(check).toBe(LICENSE_STATUS.Unavailable);
    });

    test('should return Expired if not active', async () => {
      ({ plugin, license } = await setup({
        license: {
          status: 'not-active',
        },
      }));

      const { check } = license.check('test', 'basic');

      expect(check).toBe(LICENSE_STATUS.Expired);
    });
  });

  describe('basic', () => {
    test('isBasic is true if active and basic', async () => {
      ({ plugin, license } = await setup());

      expect(license.isBasic).toBe(true);
    });

    test('isBasic is false if active and not basic', async () => {
      ({ plugin, license } = await setup({
        license: {
          type: 'gold',
        },
      }));

      expect(license.isBasic).toBe(false);
    });

    test('isBasic is false if not active and basic', async () => {
      ({ plugin, license } = await setup({
        license: {
          status: 'not-active',
        },
      }));

      expect(license.isBasic).toBe(false);
    });

    test('isNotBasic is false if not active', async () => {
      ({ plugin, license } = await setup({
        license: {
          status: 'not-active',
        },
      }));

      expect(license.isNotBasic).toBe(false);
    });

    test('isNotBasic is true if active and not basic', async () => {
      ({ plugin, license } = await setup({
        license: {
          type: 'gold',
        },
      }));

      expect(license.isNotBasic).toBe(true);
    });

    test('isNotBasic is false if active and basic', async () => {
      ({ plugin, license } = await setup());

      expect(license.isNotBasic).toBe(false);
    });
  });
});
