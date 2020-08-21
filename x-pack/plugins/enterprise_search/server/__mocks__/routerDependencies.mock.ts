/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loggingSystemMock } from 'src/core/server/mocks';
import { ConfigType } from '../../';

export const mockLogger = loggingSystemMock.createLogger().get();

export const mockConfig = {
  enabled: true,
  host: 'http://localhost:3002',
  accessCheckTimeout: 5000,
  accessCheckTimeoutWarning: 300,
} as ConfigType;

/**
 * This is useful for tests that don't use either config or log,
 * but should still pass them in to pass Typescript definitions
 */
export const mockDependencies = {
  // Mock router should be handled on a per-test basis
  config: mockConfig,
  log: mockLogger,
};
