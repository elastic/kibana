/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILicenseChecker } from './license_checker';

const createLicenseCheckerMock = (): jest.Mocked<ILicenseChecker> => {
  const mock = {
    getState: jest.fn(),
    getLicense: jest.fn(),
    clean: jest.fn(),
  };

  mock.getLicense.mockReturnValue(undefined);
  mock.getState.mockReturnValue({ valid: true });

  return mock;
};

export const licenseCheckerMock = {
  create: createLicenseCheckerMock,
};
