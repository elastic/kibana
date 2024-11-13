/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockRuleMigrationsDataClient } from '../data/__mocks__/mocks';

export const createRuleMigrationDataClient = jest
  .fn()
  .mockImplementation(() => mockRuleMigrationsDataClient);

export const createRuleMigrationTaskClient = jest.fn().mockImplementation(() => ({
  start: jest.fn().mockResolvedValue({ started: true }),
  stop: jest.fn().mockResolvedValue({ stopped: true }),
  getStats: jest.fn().mockResolvedValue({
    status: 'done',
    rules: {
      total: 1,
      finished: 1,
      processing: 0,
      pending: 0,
      failed: 0,
    },
  }),
  getAllStats: jest.fn().mockResolvedValue([]),
}));

export const createRuleMigrationClient = () => ({
  data: createRuleMigrationDataClient(),
  task: createRuleMigrationTaskClient(),
});

export const MockSiemRuleMigrationsClient = jest.fn().mockImplementation(createRuleMigrationClient);

export const mockSetup = jest.fn();
export const mockCreateClient = jest.fn().mockReturnValue(createRuleMigrationClient());
export const mockStop = jest.fn();

export const MockSiemRuleMigrationsService = jest.fn().mockImplementation(() => ({
  setup: mockSetup,
  createClient: mockCreateClient,
  stop: mockStop,
}));
