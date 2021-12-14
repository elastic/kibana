/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVENT_ACTION_EXECUTE_SCHEDULE,
  EVENT_ACTION_EXECUTE_START,
  EVENT_ACTION_EXECUTE_COMPLETE,
  EVENT_ACTION_EXECUTE_ERROR,
  EVENT_ACTION_EXECUTE_SAVE,
} from '../../../common/constants';

type ActionKind = 'event' | 'metrics' | 'error';

interface ActionBase<A extends string, K extends ActionKind, EventProvider> {
  event: {
    action: A;
    kind: K;
    provider: 'reporting';
    id: string;
    timezone: string;
    created?: string;
    end?: string;
    duration?: number;
  };
  kibana: { uuid?: string } & EventProvider;
  user?: { name: string };
  log: {
    logger: 'reporting';
    level: K extends 'error' ? 'error' : 'info';
  };
  message: string;
}

interface ErrorAction {
  message: string;
  code?: number;
  stack_trace?: string;
  type?: string;
}

type ReportingAction<A extends string, K extends ActionKind> = ActionBase<
  A,
  K,
  {
    reporting: K extends 'event'
      ? {
          appName: string;
          jobType: string;
          contentType: string;
          attempt: number;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          csv?: K extends 'event' ? { numColumns?: number } : {};
        }
      : K extends 'metrics'
      ? { csv?: { byteLength?: number; numRows?: number; scrollTime?: number } }
      : {};
  }
>;

export type ScheduleTask = ReportingAction<typeof EVENT_ACTION_EXECUTE_SCHEDULE, 'event'>;
export type ExecuteStart = ReportingAction<typeof EVENT_ACTION_EXECUTE_START, 'event'>;
export type ExecuteComplete = ReportingAction<typeof EVENT_ACTION_EXECUTE_COMPLETE, 'metrics'>;
export type SaveReport = ReportingAction<typeof EVENT_ACTION_EXECUTE_SAVE, 'event'>;
export type ExecuteError = ReportingAction<typeof EVENT_ACTION_EXECUTE_ERROR, 'error'> &
  ErrorAction;
