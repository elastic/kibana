/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import { LicenseState } from './license_state';
import { LICENSE_CHECK_STATE, ILicense } from '../../../licensing/server';

export const mockLicenseState = () => {
  const license: ILicense = {
    uid: '123',
    status: 'active',
    isActive: true,
    signature: 'sig',
    isAvailable: true,
    toJSON: () => ({
      signature: 'sig',
    }),
    getUnavailableReason: () => undefined,
    hasAtLeast() {
      return true;
    },
    check() {
      return {
        state: LICENSE_CHECK_STATE.Valid,
      };
    },
    getFeature() {
      return {
        isAvailable: true,
        isEnabled: true,
      };
    },
  };
  return new LicenseState(of(license));
};
