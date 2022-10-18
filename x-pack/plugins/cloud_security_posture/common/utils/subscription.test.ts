/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicenseType } from '@kbn/licensing-plugin/common/types';
import { isSubscriptionAllowed } from './subscription';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';

const ON_PREM_ALLOWED_LICENSES: readonly LicenseType[] = ['enterprise', 'trial'];
const ON_PREM_NOT_ALLOWED_LICENSES: readonly LicenseType[] = ['basic', 'gold', 'platinum'];
const ALL_LICENSE_TYPES: readonly LicenseType[] = [
  'standard',
  ...ON_PREM_NOT_ALLOWED_LICENSES,
  ...ON_PREM_NOT_ALLOWED_LICENSES,
];

describe('isSubscriptionAllowed', () => {
  it('should allow any cloud subscription', () => {
    const isCloudEnabled = true;
    ALL_LICENSE_TYPES.forEach((licenseType) => {
      const license = licenseMock.createLicense({ license: { type: licenseType } });
      expect(isSubscriptionAllowed(isCloudEnabled, license)).toBeTruthy();
    });
  });

  it('should allow enterprise and trial licenses for on-prem', () => {
    const isCloudEnabled = false;
    ON_PREM_ALLOWED_LICENSES.forEach((licenseType) => {
      const license = licenseMock.createLicense({ license: { type: licenseType } });
      expect(isSubscriptionAllowed(isCloudEnabled, license)).toBeTruthy();
    });
  });

  it('should not allow enterprise and trial licenses for on-prem', () => {
    const isCloudEnabled = false;
    ON_PREM_NOT_ALLOWED_LICENSES.forEach((licenseType) => {
      const license = licenseMock.createLicense({ license: { type: licenseType } });
      expect(isSubscriptionAllowed(isCloudEnabled, license)).toBeFalsy();
    });
  });
});
