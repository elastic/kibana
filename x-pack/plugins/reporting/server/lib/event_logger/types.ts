/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVENT_ACTION_EXECUTE_COMPLETE,
  EVENT_ACTION_EXECUTE_START,
} from '../../../common/constants';

type ActionType = typeof EVENT_ACTION_EXECUTE_START | typeof EVENT_ACTION_EXECUTE_COMPLETE;
type ActionKind = 'event' | 'metrics' | 'error';
type ActionOutcome = 'success' | 'failure';

interface ActionBase<
  A extends ActionType,
  K extends ActionKind,
  O extends ActionOutcome,
  EventProvider
> {
  event: {
    action: A;
    kind: K;
    outcome?: O;
    provider: 'reporting';
    id: string;
    timezone: string;
  };
  kibana: EventProvider;
  user?: { name: string };
  log: {
    logger: 'reporting';
    level: K extends 'error' ? 'error' : 'info';
  };
  message: string;
}

export interface ErrorAction {
  message: string;
  code?: string;
  stack_trace?: string;
  type?: string;
}

type ReportingAction<
  A extends ActionType,
  K extends ActionKind,
  O extends ActionOutcome = 'success'
> = ActionBase<
  A,
  K,
  O,
  {
    reporting: K extends 'event'
      ? {
          jobType: string;
          contentType: string;
        }
      : K extends 'metrics'
      ? {
          csv?: {
            byteLength: number;
            numRows: number;
          };
        }
      : {};
  }
>;

export type ExecuteStart = ReportingAction<typeof EVENT_ACTION_EXECUTE_START, 'event'>;
export type ExecuteComplete = ReportingAction<typeof EVENT_ACTION_EXECUTE_COMPLETE, 'metrics'>;

export type ExecuteError = ReportingAction<
  typeof EVENT_ACTION_EXECUTE_COMPLETE,
  'error',
  'failure'
> & { error: ErrorAction };
