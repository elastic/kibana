/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { License } from '../../licensing/common/license';
import * as serviceMap from './service_map';

describe('service map helpers', () => {
  describe('isValidPlatinumLicense', () => {
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

        expect(serviceMap.isValidPlatinumLicense(license)).toEqual(false);
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

        expect(serviceMap.isValidPlatinumLicense(license)).toEqual(false);
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

        expect(serviceMap.isValidPlatinumLicense(license)).toEqual(true);
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

        expect(serviceMap.isValidPlatinumLicense(license)).toEqual(true);
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

        expect(serviceMap.isValidPlatinumLicense(license)).toEqual(true);
      });
    });
  });
});
