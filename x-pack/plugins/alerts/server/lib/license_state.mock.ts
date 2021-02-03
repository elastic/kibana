/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILicenseState } from './license_state';

export const createLicenseStateMock = () => {
  const licenseState: jest.Mocked<ILicenseState> = {
    clean: jest.fn(),
    getLicenseInformation: jest.fn(),
    ensureLicenseForAlertType: jest.fn(),
    getLicenseCheckForAlertType: jest.fn().mockResolvedValue({
      isValid: true,
    }),
    checkLicense: jest.fn().mockResolvedValue({
      state: 'valid',
    }),
    setNotifyUsage: jest.fn(),
  };
  return licenseState;
};

export const licenseStateMock = {
  create: createLicenseStateMock,
};
