/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionType } from '../types';
import { Subject } from 'rxjs';
import { LicenseState, ILicenseState } from './license_state';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { ILicense } from '@kbn/licensing-plugin/server';

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
  const mockNotifyUsage = jest.fn();
  const fooActionType: ActionType = {
    id: 'foo',
    name: 'Foo',
    minimumLicenseRequired: 'gold',
    executor: async (options) => {
      return { status: 'ok', actionId: options.actionId };
    },
  };

  beforeEach(() => {
    license = new Subject();
    licenseState = new LicenseState(license);
    licenseState.setNotifyUsage(mockNotifyUsage);
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

  test('should not call notifyUsage by default', () => {
    const goldLicense = licensingMock.createLicense({
      license: { status: 'active', type: 'gold' },
    });
    license.next(goldLicense);
    licenseState.isLicenseValidForActionType(fooActionType);
    expect(mockNotifyUsage).not.toHaveBeenCalled();
  });

  test('should not call notifyUsage on basic action types', () => {
    const basicLicense = licensingMock.createLicense({
      license: { status: 'active', type: 'basic' },
    });
    license.next(basicLicense);
    licenseState.isLicenseValidForActionType({
      ...fooActionType,
      minimumLicenseRequired: 'basic',
    });
    expect(mockNotifyUsage).not.toHaveBeenCalled();
  });

  test('should call notifyUsage when specified', () => {
    const goldLicense = licensingMock.createLicense({
      license: { status: 'active', type: 'gold' },
    });
    license.next(goldLicense);
    licenseState.isLicenseValidForActionType(fooActionType, { notifyUsage: true });
    expect(mockNotifyUsage).toHaveBeenCalledWith('Connector: Foo');
  });
});

describe('ensureLicenseForActionType()', () => {
  let license: Subject<ILicense>;
  let licenseState: ILicenseState;
  const mockNotifyUsage = jest.fn();
  const fooActionType: ActionType = {
    id: 'foo',
    name: 'Foo',
    minimumLicenseRequired: 'gold',
    executor: async (options) => {
      return { status: 'ok', actionId: options.actionId };
    },
  };

  beforeEach(() => {
    license = new Subject();
    licenseState = new LicenseState(license);
    licenseState.setNotifyUsage(mockNotifyUsage);
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

  test('should call notifyUsage', () => {
    const goldLicense = licensingMock.createLicense({
      license: { status: 'active', type: 'gold' },
    });
    license.next(goldLicense);
    licenseState.ensureLicenseForActionType(fooActionType);
    expect(mockNotifyUsage).toHaveBeenCalledWith('Connector: Foo');
  });
});

function createUnavailableLicense() {
  const unavailableLicense = licensingMock.createLicenseMock();
  unavailableLicense.isAvailable = false;
  return unavailableLicense;
}
