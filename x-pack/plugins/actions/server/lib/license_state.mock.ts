/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILicenseState } from './license_state';
import { LICENSE_CHECK_STATE } from '../../../licensing/server';

export const createLicenseStateMock = () => {
  const licenseState: jest.Mocked<ILicenseState> = {
    clean: jest.fn(),
    getLicenseInformation: jest.fn(),
    ensureLicenseForActionType: jest.fn(),
    checkLicense: jest.fn().mockResolvedValue({
      state: LICENSE_CHECK_STATE.Valid,
    }),
  };
  return licenseState;
};

export const licenseStateMock = {
  create: createLicenseStateMock,
};
