/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const createRuleMigrationDataClient = () => ({
  create: jest.fn().mockResolvedValue({ success: true }),
  takePending: jest.fn().mockResolvedValue([]),
  releaseProcessing: jest.fn(),
  finishProcessing: jest.fn(),
  finish: jest.fn(),
});
export const createRuleMigrationTaskClient = () => ({
  run: jest.fn().mockResolvedValue({ processed: 0 }),
  cancel: jest.fn(),
});

export const createRuleMigrationClient = () => ({
  data: createRuleMigrationDataClient(),
  task: createRuleMigrationTaskClient(),
});

export const MockSiemRuleMigrationsClient = jest.fn().mockImplementation(createRuleMigrationClient);

export const mockSetup = jest.fn();
export const mockCreateClient = jest.fn().mockReturnValue(createRuleMigrationClient());

export const MockSiemRuleMigrationsService = jest.fn().mockImplementation(() => ({
  setup: mockSetup,
  createClient: mockCreateClient,
}));
