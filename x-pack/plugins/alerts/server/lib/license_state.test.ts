/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertType } from '../types';
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

describe('getLicenseCheckForAlertType', () => {
  let license: Subject<ILicense>;
  let licenseState: ILicenseState;
  const mockNotifyUsage = jest.fn();
  const alertType: AlertType<never, never, never, never, 'default', 'recovered'> = {
    id: 'test',
    name: 'Test',
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    defaultActionGroupId: 'default',
    executor: jest.fn(),
    producer: 'alerts',
    minimumLicenseRequired: 'gold',
    recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
  };

  beforeEach(() => {
    license = new Subject();
    licenseState = new LicenseState(license);
    licenseState.setNotifyUsage(mockNotifyUsage);
  });

  test('should return false when license not defined', () => {
    expect(
      licenseState.getLicenseCheckForAlertType(
        alertType.id,
        alertType.name,
        alertType.minimumLicenseRequired
      )
    ).toEqual({
      isValid: false,
      reason: 'unavailable',
    });
  });

  test('should return false when license not available', () => {
    license.next(createUnavailableLicense());
    expect(
      licenseState.getLicenseCheckForAlertType(
        alertType.id,
        alertType.name,
        alertType.minimumLicenseRequired
      )
    ).toEqual({
      isValid: false,
      reason: 'unavailable',
    });
  });

  test('should return false when license is expired', () => {
    const expiredLicense = licensingMock.createLicense({ license: { status: 'expired' } });
    license.next(expiredLicense);
    expect(
      licenseState.getLicenseCheckForAlertType(
        alertType.id,
        alertType.name,
        alertType.minimumLicenseRequired
      )
    ).toEqual({
      isValid: false,
      reason: 'expired',
    });
  });

  test('should return false when license is invalid', () => {
    const basicLicense = licensingMock.createLicense({
      license: { status: 'active', type: 'basic' },
    });
    license.next(basicLicense);
    expect(
      licenseState.getLicenseCheckForAlertType(
        alertType.id,
        alertType.name,
        alertType.minimumLicenseRequired
      )
    ).toEqual({
      isValid: false,
      reason: 'invalid',
    });
  });

  test('should return true when license is valid', () => {
    const goldLicense = licensingMock.createLicense({
      license: { status: 'active', type: 'gold' },
    });
    license.next(goldLicense);
    expect(
      licenseState.getLicenseCheckForAlertType(
        alertType.id,
        alertType.name,
        alertType.minimumLicenseRequired
      )
    ).toEqual({
      isValid: true,
    });
  });

  test('should not call notifyUsage by default', () => {
    const goldLicense = licensingMock.createLicense({
      license: { status: 'active', type: 'gold' },
    });
    license.next(goldLicense);
    licenseState.getLicenseCheckForAlertType(alertType.id, alertType.name, 'gold');
    expect(mockNotifyUsage).not.toHaveBeenCalled();
  });

  test('should not call notifyUsage on basic action types', () => {
    const basicLicense = licensingMock.createLicense({
      license: { status: 'active', type: 'basic' },
    });
    license.next(basicLicense);
    licenseState.getLicenseCheckForAlertType(alertType.id, alertType.name, 'basic');
    expect(mockNotifyUsage).not.toHaveBeenCalled();
  });

  test('should call notifyUsage when specified', () => {
    const goldLicense = licensingMock.createLicense({
      license: { status: 'active', type: 'gold' },
    });
    license.next(goldLicense);
    licenseState.getLicenseCheckForAlertType(
      alertType.id,
      alertType.name,
      alertType.minimumLicenseRequired,
      { notifyUsage: true }
    );
    expect(mockNotifyUsage).toHaveBeenCalledWith('Alert: Test');
  });
});

describe('ensureLicenseForAlertType()', () => {
  let license: Subject<ILicense>;
  let licenseState: ILicenseState;
  const mockNotifyUsage = jest.fn();
  const alertType: AlertType<never, never, never, never, string, string> = {
    id: 'test',
    name: 'Test',
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    defaultActionGroupId: 'default',
    executor: jest.fn(),
    producer: 'alerts',
    minimumLicenseRequired: 'gold',
    recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
  };

  beforeEach(() => {
    license = new Subject();
    licenseState = new LicenseState(license);
    licenseState.setNotifyUsage(mockNotifyUsage);
  });

  test('should throw when license not defined', () => {
    expect(() =>
      licenseState.ensureLicenseForAlertType(alertType)
    ).toThrowErrorMatchingInlineSnapshot(
      `"Alert type test is disabled because license information is not available at this time."`
    );
  });

  test('should throw when license not available', () => {
    license.next(createUnavailableLicense());
    expect(() =>
      licenseState.ensureLicenseForAlertType(alertType)
    ).toThrowErrorMatchingInlineSnapshot(
      `"Alert type test is disabled because license information is not available at this time."`
    );
  });

  test('should throw when license is expired', () => {
    const expiredLicense = licensingMock.createLicense({ license: { status: 'expired' } });
    license.next(expiredLicense);
    expect(() =>
      licenseState.ensureLicenseForAlertType(alertType)
    ).toThrowErrorMatchingInlineSnapshot(
      `"Alert type test is disabled because your basic license has expired."`
    );
  });

  test('should throw when license is invalid', () => {
    const basicLicense = licensingMock.createLicense({
      license: { status: 'active', type: 'basic' },
    });
    license.next(basicLicense);
    expect(() =>
      licenseState.ensureLicenseForAlertType(alertType)
    ).toThrowErrorMatchingInlineSnapshot(
      `"Alert test is disabled because it requires a Gold license. Contact your administrator to upgrade your license."`
    );
  });

  test('should not throw when license is valid', () => {
    const goldLicense = licensingMock.createLicense({
      license: { status: 'active', type: 'gold' },
    });
    license.next(goldLicense);
    licenseState.ensureLicenseForAlertType(alertType);
  });

  test('should call notifyUsage', () => {
    const goldLicense = licensingMock.createLicense({
      license: { status: 'active', type: 'gold' },
    });
    license.next(goldLicense);
    licenseState.ensureLicenseForAlertType(alertType);
    expect(mockNotifyUsage).toHaveBeenCalledWith('Alert: Test');
  });
});

function createUnavailableLicense() {
  const unavailableLicense = licensingMock.createLicenseMock();
  unavailableLicense.isAvailable = false;
  return unavailableLicense;
}
