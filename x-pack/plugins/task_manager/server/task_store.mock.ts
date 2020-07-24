/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskStore } from './task_store';

interface TaskStoreOptions {
  maxAttempts?: number;
  index?: string;
  taskManagerId?: string;
}
export const taskStoreMock = {
  create({ maxAttempts = 0, index = '', taskManagerId = '' }: TaskStoreOptions) {
    const mocked = ({
      update: jest.fn(),
      remove: jest.fn(),
      schedule: jest.fn(),
      claimAvailableTasks: jest.fn(),
      bulkUpdate: jest.fn(),
      get: jest.fn(),
      getLifecycle: jest.fn(),
      fetch: jest.fn(),
      maxAttempts,
      index,
      taskManagerId,
    } as unknown) as jest.Mocked<TaskStore>;
    return mocked;
  },
};
