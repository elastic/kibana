/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ILicense, PublicLicense, PublicFeatures, LICENSE_CHECK_STATE } from './types';
import { License } from './license';

function createLicense({
  license = {},
  features = {},
  signature = 'xxxxxxxxx',
}: {
  license?: Partial<PublicLicense>;
  features?: PublicFeatures;
  signature?: string;
} = {}) {
  const defaultLicense = {
    uid: 'uid-000000001234',
    status: 'active',
    type: 'basic',
    mode: 'basic',
    expiryDateInMillis: 5000,
  };

  const defaultFeatures = {
    ccr: {
      isEnabled: true,
      isAvailable: true,
    },
    ml: {
      isEnabled: false,
      isAvailable: true,
    },
  };
  return new License({
    license: Object.assign(defaultLicense, license),
    features: Object.assign(defaultFeatures, features),
    signature,
  });
}

const createLicenseMock = () => {
  const mock: jest.Mocked<ILicense> = {
    isActive: true,
    isAvailable: true,
    signature: '',
    toJSON: jest.fn(),
    getUnavailableReason: jest.fn(),
    getFeature: jest.fn(),
    check: jest.fn(),
    hasAtLeast: jest.fn(),
  };
  mock.check.mockReturnValue({ state: LICENSE_CHECK_STATE.Valid });
  mock.hasAtLeast.mockReturnValue(true);
  return mock;
};
export const licenseMock = {
  createLicense,
  createLicenseMock,
};
