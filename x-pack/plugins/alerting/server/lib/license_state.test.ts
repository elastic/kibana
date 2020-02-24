/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { LicenseState } from './license_state';
import { licensingMock } from '../../../../plugins/licensing/server/mocks';
import { LICENSE_CHECK_STATE } from '../../../../plugins/licensing/server';

describe('license_state', () => {
  let getRawLicense: any;

  beforeEach(() => {
    getRawLicense = jest.fn();
  });

  describe('status is LICENSE_STATUS_INVALID', () => {
    beforeEach(() => {
      const license = licensingMock.createLicense({ license: { status: 'invalid' } });
      license.check = jest.fn(() => ({
        state: LICENSE_CHECK_STATE.Invalid,
      }));
      getRawLicense.mockReturnValue(license);
    });

    it('check application link should be disabled', () => {
      const licensing = licensingMock.createSetup();
      const licenseState = new LicenseState(licensing.license$);
      const alertingLicenseInfo = licenseState.checkLicense(getRawLicense());
      expect(alertingLicenseInfo.enableAppLink).to.be(false);
    });
  });

  describe('status is LICENSE_STATUS_VALID', () => {
    beforeEach(() => {
      const license = licensingMock.createLicense({ license: { status: 'active' } });
      license.check = jest.fn(() => ({
        state: LICENSE_CHECK_STATE.Valid,
      }));
      getRawLicense.mockReturnValue(license);
    });

    it('check application link should be enabled', () => {
      const licensing = licensingMock.createSetup();
      const licenseState = new LicenseState(licensing.license$);
      const alertingLicenseInfo = licenseState.checkLicense(getRawLicense());
      expect(alertingLicenseInfo.enableAppLink).to.be(true);
    });
  });
});
