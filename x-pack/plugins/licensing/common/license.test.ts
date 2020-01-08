/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { License } from './license';
import { LICENSE_CHECK_STATE } from './types';
import { licenseMock } from './licensing.mock';

describe('License', () => {
  const basicLicense = licenseMock.createLicense();
  const basicExpiredLicense = licenseMock.createLicense({ license: { status: 'expired' } });
  const goldLicense = licenseMock.createLicense({ license: { type: 'gold' } });
  const enterpriseLicense = licenseMock.createLicense({ license: { type: 'enterprise' } });

  const errorMessage = 'unavailable';
  const errorLicense = new License({ error: errorMessage, signature: '' });
  const unavailableLicense = new License({ signature: '' });

  it('uid', () => {
    expect(basicLicense.uid).toBe('uid-000000001234');
    expect(errorLicense.uid).toBeUndefined();
    expect(unavailableLicense.uid).toBeUndefined();
  });

  it('status', () => {
    expect(basicLicense.status).toBe('active');
    expect(errorLicense.status).toBeUndefined();
    expect(unavailableLicense.status).toBeUndefined();
  });

  it('expiryDateInMillis', () => {
    expect(basicLicense.expiryDateInMillis).toBe(5000);
    expect(errorLicense.expiryDateInMillis).toBeUndefined();
    expect(unavailableLicense.expiryDateInMillis).toBeUndefined();
  });

  it('type', () => {
    expect(basicLicense.type).toBe('basic');
    expect(goldLicense.type).toBe('gold');
    expect(errorLicense.type).toBeUndefined();
    expect(unavailableLicense.type).toBeUndefined();
  });

  it('isActive', () => {
    expect(basicLicense.isActive).toBe(true);
    expect(basicExpiredLicense.isActive).toBe(false);
    expect(errorLicense.isActive).toBe(false);
    expect(unavailableLicense.isActive).toBe(false);
  });

  it('hasAtLeast', () => {
    expect(basicLicense.hasAtLeast('platinum')).toBe(false);
    expect(basicLicense.hasAtLeast('gold')).toBe(false);
    expect(basicLicense.hasAtLeast('basic')).toBe(true);

    expect(errorLicense.hasAtLeast('basic')).toBe(false);

    expect(unavailableLicense.hasAtLeast('basic')).toBe(false);

    expect(goldLicense.hasAtLeast('basic')).toBe(true);
    expect(goldLicense.hasAtLeast('gold')).toBe(true);
    expect(goldLicense.hasAtLeast('platinum')).toBe(false);

    expect(enterpriseLicense.hasAtLeast('basic')).toBe(true);
    expect(enterpriseLicense.hasAtLeast('platinum')).toBe(true);
    expect(enterpriseLicense.hasAtLeast('enterprise')).toBe(true);
    expect(enterpriseLicense.hasAtLeast('trial')).toBe(false);
  });

  it('getUnavailableReason', () => {
    expect(basicLicense.getUnavailableReason()).toBe(undefined);
    expect(errorLicense.getUnavailableReason()).toBe(errorMessage);
    expect(unavailableLicense.getUnavailableReason()).toBe(
      'X-Pack plugin is not installed on the Elasticsearch cluster.'
    );
  });

  it('getFeature provides feature info', () => {
    expect(basicLicense.getFeature('ml')).toEqual({ isEnabled: false, isAvailable: true });
    expect(basicLicense.getFeature('unknown')).toEqual({ isEnabled: false, isAvailable: false });
    expect(errorLicense.getFeature('ml')).toEqual({ isEnabled: false, isAvailable: false });
    expect(unavailableLicense.getFeature('ml')).toEqual({ isEnabled: false, isAvailable: false });
  });

  describe('check', () => {
    it('provides availability status', () => {
      expect(basicLicense.check('ccr', 'gold').state).toBe(LICENSE_CHECK_STATE.Invalid);

      expect(goldLicense.check('ccr', 'gold').state).toBe(LICENSE_CHECK_STATE.Valid);
      expect(goldLicense.check('ccr', 'basic').state).toBe(LICENSE_CHECK_STATE.Valid);

      expect(basicExpiredLicense.check('ccr', 'gold').state).toBe(LICENSE_CHECK_STATE.Expired);

      expect(errorLicense.check('ccr', 'basic').state).toBe(LICENSE_CHECK_STATE.Unavailable);
      expect(errorLicense.check('ccr', 'gold').state).toBe(LICENSE_CHECK_STATE.Unavailable);

      expect(unavailableLicense.check('ccr', 'basic').state).toBe(LICENSE_CHECK_STATE.Unavailable);
      expect(unavailableLicense.check('ccr', 'gold').state).toBe(LICENSE_CHECK_STATE.Unavailable);

      expect(enterpriseLicense.check('ccr', 'gold').state).toBe(LICENSE_CHECK_STATE.Valid);
      expect(enterpriseLicense.check('ccr', 'enterprise').state).toBe(LICENSE_CHECK_STATE.Valid);
    });

    it('throws in case of unknown license type', () => {
      expect(() => basicLicense.check('ccr', 'any' as any)).toThrowErrorMatchingInlineSnapshot(
        `"\\"any\\" is not a valid license type"`
      );

      expect(() => basicLicense.hasAtLeast('any' as any)).toThrowErrorMatchingInlineSnapshot(
        `"\\"any\\" is not a valid license type"`
      );
    });
  });
});
