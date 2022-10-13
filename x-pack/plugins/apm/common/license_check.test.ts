/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { License } from '@kbn/licensing-plugin/common/license';
import { isActiveGoldLicense, isActivePlatinumLicense } from './license_check';

describe('License check', () => {
  describe('isActivePlatinumLicense', () => {
    describe('with an expired license', () => {
      it('returns false', () => {
        const license = new License({
          license: {
            uid: 'test uid',
            expiryDateInMillis: 0,
            mode: 'platinum',
            type: 'platinum',
            status: 'expired',
          },
          signature: 'test signature',
        });

        expect(isActivePlatinumLicense(license)).toEqual(false);
      });
    });

    describe('with a basic license', () => {
      it('returns false', () => {
        const license = new License({
          license: {
            uid: 'test uid',
            expiryDateInMillis: 0,
            mode: 'basic',
            type: 'basic',
            status: 'active',
          },
          signature: 'test signature',
        });

        expect(isActivePlatinumLicense(license)).toEqual(false);
      });
    });

    describe('with a gold license', () => {
      it('returns true', () => {
        const license = new License({
          license: {
            uid: 'test uid',
            expiryDateInMillis: 0,
            mode: 'gold',
            type: 'gold',
            status: 'active',
          },
          signature: 'test signature',
        });

        expect(isActivePlatinumLicense(license)).toEqual(false);
      });
    });

    describe('with a platinum license', () => {
      it('returns true', () => {
        const license = new License({
          license: {
            uid: 'test uid',
            expiryDateInMillis: 0,
            mode: 'platinum',
            type: 'platinum',
            status: 'active',
          },
          signature: 'test signature',
        });

        expect(isActivePlatinumLicense(license)).toEqual(true);
      });
    });

    describe('with an enterprise license', () => {
      it('returns true', () => {
        const license = new License({
          license: {
            uid: 'test uid',
            expiryDateInMillis: 0,
            mode: 'enterprise',
            type: 'enterprise',
            status: 'active',
          },
          signature: 'test signature',
        });

        expect(isActivePlatinumLicense(license)).toEqual(true);
      });
    });

    describe('with a trial license', () => {
      it('returns true', () => {
        const license = new License({
          license: {
            uid: 'test uid',
            expiryDateInMillis: 0,
            mode: 'trial',
            type: 'trial',
            status: 'active',
          },
          signature: 'test signature',
        });

        expect(isActivePlatinumLicense(license)).toEqual(true);
      });
    });
  });
  describe('isActiveGoldLicense', () => {
    describe('with an expired license', () => {
      it('returns false', () => {
        const license = new License({
          license: {
            uid: 'test uid',
            expiryDateInMillis: 0,
            mode: 'gold',
            type: 'gold',
            status: 'expired',
          },
          signature: 'test signature',
        });

        expect(isActiveGoldLicense(license)).toEqual(false);
      });
    });

    describe('with a basic license', () => {
      it('returns false', () => {
        const license = new License({
          license: {
            uid: 'test uid',
            expiryDateInMillis: 0,
            mode: 'basic',
            type: 'basic',
            status: 'active',
          },
          signature: 'test signature',
        });

        expect(isActiveGoldLicense(license)).toEqual(false);
      });
    });

    describe('with a gold license', () => {
      it('returns true', () => {
        const license = new License({
          license: {
            uid: 'test uid',
            expiryDateInMillis: 0,
            mode: 'gold',
            type: 'gold',
            status: 'active',
          },
          signature: 'test signature',
        });

        expect(isActiveGoldLicense(license)).toEqual(true);
      });
    });

    describe('with a platinum license', () => {
      it('returns true', () => {
        const license = new License({
          license: {
            uid: 'test uid',
            expiryDateInMillis: 0,
            mode: 'platinum',
            type: 'platinum',
            status: 'active',
          },
          signature: 'test signature',
        });

        expect(isActiveGoldLicense(license)).toEqual(true);
      });
    });

    describe('with an enterprise license', () => {
      it('returns true', () => {
        const license = new License({
          license: {
            uid: 'test uid',
            expiryDateInMillis: 0,
            mode: 'enterprise',
            type: 'enterprise',
            status: 'active',
          },
          signature: 'test signature',
        });

        expect(isActiveGoldLicense(license)).toEqual(true);
      });
    });

    describe('with a trial license', () => {
      it('returns true', () => {
        const license = new License({
          license: {
            uid: 'test uid',
            expiryDateInMillis: 0,
            mode: 'trial',
            type: 'trial',
            status: 'active',
          },
          signature: 'test signature',
        });

        expect(isActiveGoldLicense(license)).toEqual(true);
      });
    });
  });
});
