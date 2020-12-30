/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { licensingMock } from '../../../../licensing/server/mocks';
import { checkLicense } from './check_license';

describe('check_license', function () {
  describe('returns "valid": false & message when', () => {
    it('license information is not available', () => {
      const license = licensingMock.createLicenseMock();
      license.isAvailable = false;

      const { valid, message } = checkLicense(license);

      expect(valid).toBe(false);
      expect(message).toStrictEqual(expect.any(String));
    });

    it('license level is not enough', () => {
      const license = licensingMock.createLicenseMock();
      license.hasAtLeast.mockReturnValue(false);

      const { valid, message } = checkLicense(license);

      expect(valid).toBe(false);
      expect(message).toStrictEqual(expect.any(String));
    });

    it('license is expired', () => {
      const license = licensingMock.createLicenseMock();
      license.isActive = false;

      const { valid, message } = checkLicense(license);

      expect(valid).toBe(false);
      expect(message).toStrictEqual(expect.any(String));
    });

    it('elasticsearch security is disabled', () => {
      const license = licensingMock.createLicenseMock();
      license.getFeature.mockReturnValue({ isEnabled: false, isAvailable: false });

      const { valid, message } = checkLicense(license);

      expect(valid).toBe(false);
      expect(message).toStrictEqual(expect.any(String));
    });
  });

  it('returns "valid": true without message otherwise', () => {
    const license = licensingMock.createLicenseMock();

    const { valid, message } = checkLicense(license);

    expect(valid).toBe(true);
    expect(message).toBe(null);
  });
});
