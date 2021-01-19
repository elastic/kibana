/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import { SecurityLicense, SecurityLicenseFeatures } from '.';

export const licenseMock = {
  create: (features?: Partial<SecurityLicenseFeatures>): jest.Mocked<SecurityLicense> => ({
    isLicenseAvailable: jest.fn(),
    isEnabled: jest.fn().mockReturnValue(true),
    getType: jest.fn().mockReturnValue('basic'),
    getFeatures: jest.fn(),
    features$: features ? of(features as SecurityLicenseFeatures) : of(),
  }),
};
