/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from 'src/core/server/mocks';

import { ConfigType } from '../';

export const mockLogger = loggingSystemMock.createLogger().get();

export const mockRequestHandler = {
  createRequest: jest.fn(() => () => {}),
  hasValidData(data: any) {
    return (this.createRequest as jest.Mock).mock.calls[0][0].hasValidData(data);
  },
};

export const mockConfig = {
  host: 'http://localhost:3002',
  accessCheckTimeout: 5000,
  accessCheckTimeoutWarning: 300,
  ssl: {},
} as ConfigType;

/**
 * This is useful for tests that don't use either config or log,
 * but should still pass them in to pass Typescript definitions
 */
export const mockDependencies = {
  // Mock router should be handled on a per-test basis
  config: mockConfig,
  log: mockLogger,
  enterpriseSearchRequestHandler: mockRequestHandler as any,
};
