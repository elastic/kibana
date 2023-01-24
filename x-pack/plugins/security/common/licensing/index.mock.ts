/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, of } from 'rxjs';

import type { LicenseType } from '@kbn/licensing-plugin/common/types';
import { LICENSE_TYPE } from '@kbn/licensing-plugin/common/types';

import type { SecurityLicenseFeatures } from './license_features';
import type { SecurityLicense } from './license_service';

export const licenseMock = {
  create: (
    features: Partial<SecurityLicenseFeatures> | Observable<Partial<SecurityLicenseFeatures>> = {},
    licenseType: LicenseType = 'basic' // default to basic if this is not specified
  ): jest.Mocked<SecurityLicense> => ({
    isLicenseAvailable: jest.fn().mockReturnValue(true),
    isEnabled: jest.fn().mockReturnValue(true),
    getFeatures: jest.fn().mockReturnValue(features),
    hasAtLeast: jest
      .fn()
      .mockImplementation(
        (licenseTypeToCheck: LicenseType) =>
          LICENSE_TYPE[licenseTypeToCheck] <= LICENSE_TYPE[licenseType]
      ),
    features$:
      features instanceof Observable
        ? (features as Observable<SecurityLicenseFeatures>)
        : of((features ?? {}) as SecurityLicenseFeatures),
  }),
};
