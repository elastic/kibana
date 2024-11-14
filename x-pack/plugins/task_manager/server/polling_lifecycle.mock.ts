/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskPollingLifecycle, TaskLifecycleEvent } from './polling_lifecycle';
import { of, Observable } from 'rxjs';

export const taskPollingLifecycleMock = {
  create(opts: {
    isStarted?: boolean;
    events$?: Observable<TaskLifecycleEvent>;
    pollIntervalConfiguration$?: Observable<number>;
    capacityConfiguration$?: Observable<number>;
  }) {
    return {
      pollIntervalConfiguration$: opts.pollIntervalConfiguration$ ?? of(),
      capacityConfiguration$: opts.capacityConfiguration$ ?? of(),
      attemptToRun: jest.fn(),
      stop: jest.fn(),
      get isStarted() {
        return opts.isStarted ?? true;
      },
      get events() {
        return opts.events$ ?? of();
      },
    } as unknown as jest.Mocked<TaskPollingLifecycle>;
  },
};
