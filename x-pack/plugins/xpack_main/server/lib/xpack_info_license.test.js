/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { XPackInfoLicense } from './xpack_info_license';

function getXPackInfoLicense(getRawLicense) {
  return new XPackInfoLicense(getRawLicense);
}

describe('XPackInfoLicense', () => {

  const xpackInfoLicenseUndefined = getXPackInfoLicense(() => { });
  let xpackInfoLicense;
  let getRawLicense;

  beforeEach(() => {
    getRawLicense = jest.fn();
    xpackInfoLicense = getXPackInfoLicense(getRawLicense);
  });

  test('getUid returns uid field', () => {
    const uid = 'abc123';

    getRawLicense.mockReturnValue({ uid });

    expect(xpackInfoLicense.getUid()).toBe(uid);
    expect(getRawLicense).toHaveBeenCalledTimes(1);

    expect(xpackInfoLicenseUndefined.getUid()).toBe(undefined);
  });

  test('isActive returns true if status is active', () => {
    getRawLicense.mockReturnValue({ status: 'active' });

    expect(xpackInfoLicense.isActive()).toBe(true);
    expect(getRawLicense).toHaveBeenCalledTimes(1);
  });

  test('isActive returns false if status is not active', () => {
    getRawLicense.mockReturnValue({ status: 'aCtIvE' }); // needs to match exactly

    expect(xpackInfoLicense.isActive()).toBe(false);
    expect(getRawLicense).toHaveBeenCalledTimes(1);

    expect(xpackInfoLicenseUndefined.isActive()).toBe(false);
  });

  test('getExpiryDateInMillis returns expiry_date_in_millis', () => {
    getRawLicense.mockReturnValue({ expiry_date_in_millis: 123 });

    expect(xpackInfoLicense.getExpiryDateInMillis()).toBe(123);
    expect(getRawLicense).toHaveBeenCalledTimes(1);

    expect(xpackInfoLicenseUndefined.getExpiryDateInMillis()).toBe(undefined);
  });

  test('isOneOf returns true of the mode includes one of the types', () => {
    getRawLicense.mockReturnValue({ mode: 'platinum' });

    expect(xpackInfoLicense.isOneOf('platinum')).toBe(true);
    expect(getRawLicense).toHaveBeenCalledTimes(1);

    expect(xpackInfoLicense.isOneOf([ 'platinum' ])).toBe(true);
    expect(getRawLicense).toHaveBeenCalledTimes(2);
    expect(xpackInfoLicense.isOneOf([ 'gold', 'platinum' ])).toBe(true);
    expect(getRawLicense).toHaveBeenCalledTimes(3);
    expect(xpackInfoLicense.isOneOf([ 'platinum', 'gold' ])).toBe(true);
    expect(getRawLicense).toHaveBeenCalledTimes(4);
    expect(xpackInfoLicense.isOneOf([ 'basic', 'gold' ])).toBe(false);
    expect(getRawLicense).toHaveBeenCalledTimes(5);
    expect(xpackInfoLicense.isOneOf([ 'basic' ])).toBe(false);
    expect(getRawLicense).toHaveBeenCalledTimes(6);

    expect(xpackInfoLicenseUndefined.isOneOf([ 'platinum', 'gold' ])).toBe(false);
  });

  test('getType returns the type', () => {
    getRawLicense.mockReturnValue({ type: 'basic' });

    expect(xpackInfoLicense.getType()).toBe('basic');
    expect(getRawLicense).toHaveBeenCalledTimes(1);

    getRawLicense.mockReturnValue({ type: 'gold' });

    expect(xpackInfoLicense.getType()).toBe('gold');
    expect(getRawLicense).toHaveBeenCalledTimes(2);

    expect(xpackInfoLicenseUndefined.getType()).toBe(undefined);
  });

  test('getMode returns the mode', () => {
    getRawLicense.mockReturnValue({ mode: 'basic' });

    expect(xpackInfoLicense.getMode()).toBe('basic');
    expect(getRawLicense).toHaveBeenCalledTimes(1);

    getRawLicense.mockReturnValue({ mode: 'gold' });

    expect(xpackInfoLicense.getMode()).toBe('gold');
    expect(getRawLicense).toHaveBeenCalledTimes(2);

    expect(xpackInfoLicenseUndefined.getMode()).toBe(undefined);
  });

  test('isActiveLicense returns the true if active and typeChecker matches', () => {
    const expectAbc123 = type => type === 'abc123';

    getRawLicense.mockReturnValue({ status: 'active', mode: 'abc123' });

    expect(xpackInfoLicense.isActiveLicense(expectAbc123)).toBe(true);
    expect(getRawLicense).toHaveBeenCalledTimes(1);

    getRawLicense.mockReturnValue({ status: 'NOTactive', mode: 'abc123' });

    expect(xpackInfoLicense.isActiveLicense(expectAbc123)).toBe(false);
    expect(getRawLicense).toHaveBeenCalledTimes(2);

    getRawLicense.mockReturnValue({ status: 'NOTactive', mode: 'NOTabc123' });

    expect(xpackInfoLicense.isActiveLicense(expectAbc123)).toBe(false);
    expect(getRawLicense).toHaveBeenCalledTimes(3);

    getRawLicense.mockReturnValue({ status: 'active', mode: 'NOTabc123' });

    expect(xpackInfoLicense.isActiveLicense(expectAbc123)).toBe(false);
    expect(getRawLicense).toHaveBeenCalledTimes(4);

    expect(xpackInfoLicenseUndefined.isActive(expectAbc123)).toBe(false);
  });

  test('isBasic returns the true if active and basic', () => {
    getRawLicense.mockReturnValue({ status: 'active', mode: 'basic' });

    expect(xpackInfoLicense.isBasic()).toBe(true);
    expect(getRawLicense).toHaveBeenCalledTimes(1);

    getRawLicense.mockReturnValue({ status: 'NOTactive', mode: 'gold' });

    expect(xpackInfoLicense.isBasic()).toBe(false);
    expect(getRawLicense).toHaveBeenCalledTimes(2);

    getRawLicense.mockReturnValue({ status: 'NOTactive', mode: 'trial' });

    expect(xpackInfoLicense.isBasic()).toBe(false);
    expect(getRawLicense).toHaveBeenCalledTimes(3);

    getRawLicense.mockReturnValue({ status: 'active', mode: 'platinum' });

    expect(xpackInfoLicense.isBasic()).toBe(false);
    expect(getRawLicense).toHaveBeenCalledTimes(4);

    expect(xpackInfoLicenseUndefined.isBasic()).toBe(false);
  });


  test('isNotBasic returns the true if active and not basic', () => {
    getRawLicense.mockReturnValue({ status: 'active', mode: 'platinum' });

    expect(xpackInfoLicense.isNotBasic()).toBe(true);
    expect(getRawLicense).toHaveBeenCalledTimes(1);

    getRawLicense.mockReturnValue({ status: 'NOTactive', mode: 'gold' });

    expect(xpackInfoLicense.isNotBasic()).toBe(false);
    expect(getRawLicense).toHaveBeenCalledTimes(2);

    getRawLicense.mockReturnValue({ status: 'NOTactive', mode: 'trial' });

    expect(xpackInfoLicense.isNotBasic()).toBe(false);
    expect(getRawLicense).toHaveBeenCalledTimes(3);

    getRawLicense.mockReturnValue({ status: 'active', mode: 'basic' });

    expect(xpackInfoLicense.isNotBasic()).toBe(false);
    expect(getRawLicense).toHaveBeenCalledTimes(4);

    expect(xpackInfoLicenseUndefined.isNotBasic()).toBe(false);
  });

});
