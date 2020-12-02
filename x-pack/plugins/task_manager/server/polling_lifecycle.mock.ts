/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskPollingLifecycle, TaskLifecycleEvent } from './polling_lifecycle';
import { of, Observable } from 'rxjs';

export const taskPollingLifecycleMock = {
  create(opts: { isStarted?: boolean; events$?: Observable<TaskLifecycleEvent> }) {
    return ({
      attemptToRun: jest.fn(),
      get isStarted() {
        return opts.isStarted ?? true;
      },
      get events() {
        return opts.events$ ?? of();
      },
    } as unknown) as jest.Mocked<TaskPollingLifecycle>;
  },
};
