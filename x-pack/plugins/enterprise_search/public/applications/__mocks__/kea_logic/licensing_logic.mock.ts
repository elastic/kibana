/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licensingMock } from '../../../../../licensing/public/mocks';

export const mockLicensingValues = {
  license: licensingMock.createLicense(),
  hasPlatinumLicense: false,
  hasGoldLicense: false,
};

jest.mock('../../shared/licensing', () => ({
  LicensingLogic: { values: mockLicensingValues },
}));
