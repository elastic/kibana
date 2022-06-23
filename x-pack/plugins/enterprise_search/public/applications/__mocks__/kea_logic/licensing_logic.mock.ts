/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

export const mockLicensingValues = {
  license: licensingMock.createLicense(),
  hasPlatinumLicense: false,
  hasGoldLicense: false,
  isTrial: false,
  canManageLicense: true,
};

jest.mock('../../shared/licensing', () => ({
  ...(jest.requireActual('../../shared/licensing') as object),
  LicensingLogic: { values: mockLicensingValues },
}));
