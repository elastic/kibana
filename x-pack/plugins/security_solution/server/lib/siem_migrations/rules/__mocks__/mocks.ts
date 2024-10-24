/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SiemRuleMigrationsClient } from '../types';

export const createRuleMigrationClient = (): SiemRuleMigrationsClient => ({
  create: jest.fn().mockResolvedValue({ success: true }),
  search: jest.fn().mockResolvedValue([]),
});

export const mockSetup = jest.fn();
export const mockGetClient = jest.fn().mockReturnValue(createRuleMigrationClient());

export const MockSiemRuleMigrationsService = jest.fn().mockImplementation(() => ({
  setup: mockSetup,
  getClient: mockGetClient,
}));
