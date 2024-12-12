/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationsDataRulesClient } from '../rule_migrations_data_rules_client';

// Rule migrations data rules client
export const mockRuleMigrationsDataRulesClient = {
  create: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue([]),
  takePending: jest.fn().mockResolvedValue([]),
  saveCompleted: jest.fn().mockResolvedValue(undefined),
  saveError: jest.fn().mockResolvedValue(undefined),
  releaseProcessing: jest.fn().mockResolvedValue(undefined),
  updateStatus: jest.fn().mockResolvedValue(undefined),
  getStats: jest.fn().mockResolvedValue(undefined),
  getAllStats: jest.fn().mockResolvedValue([]),
} as unknown as RuleMigrationsDataRulesClient;
export const MockRuleMigrationsDataRulesClient = jest
  .fn()
  .mockImplementation(() => mockRuleMigrationsDataRulesClient);

// Rule migrations data resources client
export const mockRuleMigrationsDataResourcesClient = {
  upsert: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(undefined),
};
export const MockRuleMigrationsDataResourcesClient = jest
  .fn()
  .mockImplementation(() => mockRuleMigrationsDataResourcesClient);

export const mockRuleMigrationsDataIntegrationsClient = {
  retrieveIntegrations: jest.fn().mockResolvedValue([]),
};

// Rule migrations data client
export const mockRuleMigrationsDataClient = {
  rules: mockRuleMigrationsDataRulesClient,
  resources: mockRuleMigrationsDataResourcesClient,
  integrations: mockRuleMigrationsDataIntegrationsClient,
};

export const MockRuleMigrationsDataClient = jest
  .fn()
  .mockImplementation(() => mockRuleMigrationsDataClient);

// Rule migrations data service
export const mockIndexName = 'mocked_siem_rule_migrations_index_name';
export const mockInstall = jest.fn().mockResolvedValue(undefined);
export const mockCreateClient = jest.fn().mockReturnValue(mockRuleMigrationsDataClient);

export const MockRuleMigrationsDataService = jest.fn().mockImplementation(() => ({
  createAdapter: jest.fn(),
  install: mockInstall,
  createClient: mockCreateClient,
  createIndexNameProvider: jest.fn().mockResolvedValue(mockIndexName),
}));
