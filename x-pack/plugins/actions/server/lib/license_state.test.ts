/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionType } from '../types';
import { Subject } from 'rxjs';
import { LicenseState, ILicenseState } from './license_state';
import { licensingMock } from '../../../licensing/server/mocks';
import { ILicense } from '../../../licensing/server';

describe('checkLicense()', () => {
  const getRawLicense = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('status is LICENSE_STATUS_INVALID', () => {
    beforeEach(() => {
      const license = licensingMock.createLicense({ license: { status: 'invalid' } });
      license.check = jest.fn(() => ({
        state: 'invalid',
      }));
      getRawLicense.mockReturnValue(license);
    });

    it('check application link should be disabled', () => {
      const licensing = licensingMock.createSetup();
      const licenseState = new LicenseState(licensing.license$);
      const actionsLicenseInfo = licenseState.checkLicense(getRawLicense());
      expect(actionsLicenseInfo.enableAppLink).toBe(false);
    });
  });

  describe('status is LICENSE_STATUS_VALID', () => {
    beforeEach(() => {
      const license = licensingMock.createLicense({ license: { status: 'active' } });
      license.check = jest.fn(() => ({
        state: 'valid',
      }));
      getRawLicense.mockReturnValue(license);
    });

    it('check application link should be enabled', () => {
      const licensing = licensingMock.createSetup();
      const licenseState = new LicenseState(licensing.license$);
      const actionsLicenseInfo = licenseState.checkLicense(getRawLicense());
      expect(actionsLicenseInfo.showAppLink).toBe(true);
    });
  });
});

describe('isLicenseValidForActionType', () => {
  let license: Subject<ILicense>;
  let licenseState: ILicenseState;
  const fooActionType: ActionType = {
    id: 'foo',
    name: 'Foo',
    minimumLicenseRequired: 'gold',
    executor: async () => {},
  };

  beforeEach(() => {
    license = new Subject();
    licenseState = new LicenseState(license);
  });

  test('should return false when license not defined', () => {
    expect(licenseState.isLicenseValidForActionType(fooActionType)).toEqual({
      isValid: false,
      reason: 'unavailable',
    });
  });

  test('should return false when license not available', () => {
    license.next(createUnavailableLicense());
    expect(licenseState.isLicenseValidForActionType(fooActionType)).toEqual({
      isValid: false,
      reason: 'unavailable',
    });
  });

  test('should return false when license is expired', () => {
    const expiredLicense = licensingMock.createLicense({ license: { status: 'expired' } });
    license.next(expiredLicense);
    expect(licenseState.isLicenseValidForActionType(fooActionType)).toEqual({
      isValid: false,
      reason: 'expired',
    });
  });

  test('should return false when license is invalid', () => {
    const basicLicense = licensingMock.createLicense({
      license: { status: 'active', type: 'basic' },
    });
    license.next(basicLicense);
    expect(licenseState.isLicenseValidForActionType(fooActionType)).toEqual({
      isValid: false,
      reason: 'invalid',
    });
  });

  test('should return true when license is valid', () => {
    const goldLicense = licensingMock.createLicense({
      license: { status: 'active', type: 'gold' },
    });
    license.next(goldLicense);
    expect(licenseState.isLicenseValidForActionType(fooActionType)).toEqual({
      isValid: true,
    });
  });
});

describe('ensureLicenseForActionType()', () => {
  let license: Subject<ILicense>;
  let licenseState: ILicenseState;
  const fooActionType: ActionType = {
    id: 'foo',
    name: 'Foo',
    minimumLicenseRequired: 'gold',
    executor: async () => {},
  };

  beforeEach(() => {
    license = new Subject();
    licenseState = new LicenseState(license);
  });

  test('should throw when license not defined', () => {
    expect(() =>
      licenseState.ensureLicenseForActionType(fooActionType)
    ).toThrowErrorMatchingInlineSnapshot(
      `"Action type foo is disabled because license information is not available at this time."`
    );
  });

  test('should throw when license not available', () => {
    license.next(createUnavailableLicense());
    expect(() =>
      licenseState.ensureLicenseForActionType(fooActionType)
    ).toThrowErrorMatchingInlineSnapshot(
      `"Action type foo is disabled because license information is not available at this time."`
    );
  });

  test('should throw when license is expired', () => {
    const expiredLicense = licensingMock.createLicense({ license: { status: 'expired' } });
    license.next(expiredLicense);
    expect(() =>
      licenseState.ensureLicenseForActionType(fooActionType)
    ).toThrowErrorMatchingInlineSnapshot(
      `"Action type foo is disabled because your basic license has expired."`
    );
  });

  test('should throw when license is invalid', () => {
    const basicLicense = licensingMock.createLicense({
      license: { status: 'active', type: 'basic' },
    });
    license.next(basicLicense);
    expect(() =>
      licenseState.ensureLicenseForActionType(fooActionType)
    ).toThrowErrorMatchingInlineSnapshot(
      `"Action type foo is disabled because your basic license does not support it. Please upgrade your license."`
    );
  });

  test('should not throw when license is valid', () => {
    const goldLicense = licensingMock.createLicense({
      license: { status: 'active', type: 'gold' },
    });
    license.next(goldLicense);
    licenseState.ensureLicenseForActionType(fooActionType);
  });
});

function createUnavailableLicense() {
  const unavailableLicense = licensingMock.createLicenseMock();
  unavailableLicense.isAvailable = false;
  return unavailableLicense;
}
