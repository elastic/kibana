/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { License } from './license';
import { LICENSE_CHECK_STATE } from './types';
import { licenseMock } from './license.mock';

describe('License', () => {
  const basicLicense = licenseMock.create();
  const basicExpiredLicense = licenseMock.create({ license: { status: 'expired' } });
  const goldLicense = licenseMock.create({ license: { type: 'gold' } });

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

  it('isBasic', () => {
    expect(basicLicense.isBasic).toBe(true);
    expect(goldLicense.isBasic).toBe(false);
    expect(errorLicense.isBasic).toBe(false);
    expect(unavailableLicense.isBasic).toBe(false);
  });

  it('isNotBasic', () => {
    expect(basicLicense.isNotBasic).toBe(false);
    expect(goldLicense.isNotBasic).toBe(true);
    expect(errorLicense.isNotBasic).toBe(false);
    expect(unavailableLicense.isNotBasic).toBe(false);
  });

  it('isOneOf', () => {
    expect(basicLicense.isOneOf('platinum')).toBe(false);
    expect(basicLicense.isOneOf(['platinum'])).toBe(false);
    expect(basicLicense.isOneOf(['gold', 'platinum'])).toBe(false);
    expect(basicLicense.isOneOf(['platinum', 'gold'])).toBe(false);
    expect(basicLicense.isOneOf(['basic', 'gold'])).toBe(true);
    expect(basicLicense.isOneOf(['basic'])).toBe(true);
    expect(basicLicense.isOneOf('basic')).toBe(true);

    expect(errorLicense.isOneOf(['basic', 'gold', 'platinum'])).toBe(false);

    expect(unavailableLicense.isOneOf(['basic', 'gold', 'platinum'])).toBe(false);
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
    });

    it('throws in case of unknown license type', () => {
      expect(
        () => basicLicense.check('ccr', 'any' as any).state
      ).toThrowErrorMatchingInlineSnapshot(`"\\"any\\" is not a valid license type"`);
    });
  });
});
