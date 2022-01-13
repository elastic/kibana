/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionType } from './';

type ActionKind = 'event' | 'error' | 'metrics';
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
    timezone: string;
  };
  kibana: EventProvider & { task?: { id?: string } };
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
    reporting: {
      id?: string; // "immediate download" exports have no ID
      jobType: string;
      byteSize?: number;
    };
  }
>;

export type ScheduledTask = ReportingAction<ActionType.SCHEDULE_TASK, 'event'>;
export type StartedExecution = ReportingAction<ActionType.EXECUTE_START, 'event'>;
export type CompletedExecution = ReportingAction<ActionType.EXECUTE_COMPLETE, 'metrics'>;
export type SavedReport = ReportingAction<ActionType.SAVE_REPORT, 'event'>;
export type ClaimedTask = ReportingAction<ActionType.CLAIM_TASK, 'event'>;
export type ScheduledRetry = ReportingAction<ActionType.RETRY, 'event'>;
export type FailedReport = ReportingAction<ActionType.FAIL_REPORT, 'event'>;
export type ExecuteError = ReportingAction<ActionType.EXECUTE_COMPLETE, 'error', 'failure'> & {
  error: ErrorAction;
};
