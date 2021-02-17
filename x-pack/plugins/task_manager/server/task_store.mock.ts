/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskStore } from './task_store';

interface TaskStoreOptions {
  index?: string;
  taskManagerId?: string;
}
export const taskStoreMock = {
  create({ index = '', taskManagerId = '' }: TaskStoreOptions = {}) {
    const mocked = ({
      convertToSavedObjectIds: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      schedule: jest.fn(),
      bulkUpdate: jest.fn(),
      get: jest.fn(),
      getLifecycle: jest.fn(),
      fetch: jest.fn(),
      aggregate: jest.fn(),
      updateByQuery: jest.fn(),
      index,
      taskManagerId,
    } as unknown) as jest.Mocked<TaskStore>;
    return mocked;
  },
};
