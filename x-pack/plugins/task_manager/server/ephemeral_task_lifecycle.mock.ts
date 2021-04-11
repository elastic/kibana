/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EphemeralTaskLifecycle } from './ephemeral_task_lifecycle';
import { TaskLifecycleEvent } from './polling_lifecycle';
import { of, Observable } from 'rxjs';

export const ephemeralTaskLifecycleMock = {
  create(opts: { events$?: Observable<TaskLifecycleEvent> }) {
    return ({
      attemptToRun: jest.fn(),
      get events() {
        return opts.events$ ?? of();
      },
    } as unknown) as jest.Mocked<EphemeralTaskLifecycle>;
  },
};
