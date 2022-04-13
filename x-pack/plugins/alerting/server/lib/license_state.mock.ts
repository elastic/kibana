/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ILicenseState } from './license_state';

export const createLicenseStateMock = () => {
  const licenseState: jest.Mocked<ILicenseState> = {
    clean: jest.fn(),
    getLicenseInformation: jest.fn(),
    ensureLicenseForRuleType: jest.fn(),
    getLicenseCheckForRuleType: jest.fn().mockResolvedValue({
      isValid: true,
    }),
    checkLicense: jest.fn().mockResolvedValue({
      state: 'valid',
    }),
    getIsSecurityEnabled: jest.fn(),
    setNotifyUsage: jest.fn(),
  };
  return licenseState;
};

export const licenseStateMock = {
  create: createLicenseStateMock,
};
