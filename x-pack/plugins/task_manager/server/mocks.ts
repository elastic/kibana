/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskManagerSetupContract, TaskManagerStartContract } from './plugin';

const createSetupMock = () => {
  const mock: jest.Mocked<TaskManagerSetupContract> = {
    addMiddleware: jest.fn(),
    registerTaskDefinitions: jest.fn(),
  };
  return mock;
};

const createStartMock = () => {
  const mock: jest.Mocked<TaskManagerStartContract> = {
    fetch: jest.fn(),
    get: jest.fn(),
    remove: jest.fn(),
    schedule: jest.fn(),
    runNow: jest.fn(),
    ensureScheduled: jest.fn(),
  };
  return mock;
};

export const taskManagerMock = {
  createSetup: createSetupMock,
  createStart: createStartMock,
};
