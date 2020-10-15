/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskPollingLifecycle, TaskLifecycleEvent } from './polling_lifecycle';
import { of, Observable } from 'rxjs';

const createTaskPollingLifecycleMock = ({
  isStarted = true,
  events$ = of(),
}: {
  isStarted?: boolean;
  events$?: Observable<TaskLifecycleEvent>;
} = {}) => {
  return ({
    start: jest.fn(),
    attemptToRun: jest.fn(),
    get isStarted() {
      return isStarted;
    },
    get events() {
      return events$;
    },
    stop: jest.fn(),
  } as unknown) as jest.Mocked<TaskPollingLifecycle>;
};

export const taskPollingLifecycleMock = {
  create: createTaskPollingLifecycleMock,
};
