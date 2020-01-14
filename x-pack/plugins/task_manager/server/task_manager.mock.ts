/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskManagerSetupContract, TaskManagerStartContract } from './plugin';
import { Subject } from 'rxjs';

export const taskManagerMock = {
  setup(overrides: Partial<jest.Mocked<TaskManagerSetupContract>> = {}) {
    const mocked: jest.Mocked<TaskManagerSetupContract> = {
      registerTaskDefinitions: jest.fn(),
      addMiddleware: jest.fn(),
      config$: new Subject(),
      registerLegacyAPI: jest.fn(),
      ...overrides,
    };
    return mocked;
  },
  start(overrides: Partial<jest.Mocked<TaskManagerStartContract>> = {}) {
    const mocked: jest.Mocked<TaskManagerStartContract> = {
      ensureScheduled: jest.fn(),
      schedule: jest.fn(),
      fetch: jest.fn(),
      runNow: jest.fn(),
      remove: jest.fn(),
      ...overrides,
    };
    return mocked;
  },
};
