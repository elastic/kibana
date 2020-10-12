/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskManager, TaskLifecycleEvent } from './task_manager';
import { of, Observable } from 'rxjs';

const createTaskManagerMock = ({
  isStarted = true,
  events = of(),
}: {
  isStarted?: boolean;
  events?: Observable<TaskLifecycleEvent>;
} = {}) => {
  return ({
    registerTaskDefinitions: jest.fn(),
    addMiddleware: jest.fn(),
    ensureScheduled: jest.fn(),
    schedule: jest.fn(),
    fetch: jest.fn(),
    aggregate: jest.fn(),
    get: jest.fn(),
    runNow: jest.fn(),
    remove: jest.fn(),
    start: jest.fn(),
    get isStarted() {
      return isStarted;
    },
    get events() {
      return events;
    },
    stop: jest.fn(),
  } as unknown) as jest.Mocked<TaskManager>;
};

export const taskManagerMock = {
  create: createTaskManagerMock,
};
