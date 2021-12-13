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

interface EventedBase<P, EventProvider> {
  event: {
    provider: P;
    kind: 'event' | 'metrics' | 'error';
    id: string;
    timezone: string;
    created?: string;
    end?: string;
    duration?: number;
  };
  kibana: { uuid: string } & EventProvider;
  user?: { name: string };
  log: {
    logger: P;
    level: 'info' | 'error';
  };
}

interface EventedError {
  message: string;
  code?: number;
  stack_trace?: string;
  type?: string;
}

type ReportingEventedBase = EventedBase<
  'reporting',
  {
    reporting: {
      appName: string;
      jobType: string;
      contentType: string;
      attempt: number;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      csv?: {
        numColumns: number;
        byteLength: number;
        numRows: number;
        scrollTime: number;
      };
    };
  }
>;

interface EventedSettings {
  settings: {
    reporting: {
      queueTimeout: number;
      csv: {
        maxSizeBytes: number;
        scrollSize: number;
        contentStream: {
          chunkSize: number;
        };
      };
    };
  };
}

type EventedReportingAction = EventedBase<'reporting', ReportingEventedBase>;
type EventedReportingActionEvent = EventedReportingAction['event'];

/*
 * Interfaces for Event Log payloads from Reporting
 */
export interface EventedReportingActionScheduleTask
  extends EventedBase<'reporting', ReportingEventedBase & EventedSettings> {
  event: EventedReportingActionEvent & { action: typeof EVENT_ACTION_EXECUTE_SCHEDULE };
}
export interface EventedReportingActionExecuteStart
  extends EventedBase<'reporting', ReportingEventedBase & EventedSettings> {
  event: EventedReportingActionEvent & { action: typeof EVENT_ACTION_EXECUTE_START };
}
export interface EventedReportingActionExecuteComplete extends EventedReportingAction {
  event: EventedReportingActionEvent & { action: typeof EVENT_ACTION_EXECUTE_COMPLETE };
}
export interface EventedReportingActionExecuteError extends EventedReportingAction {
  event: EventedReportingActionEvent & { action: typeof EVENT_ACTION_EXECUTE_ERROR };
  error: EventedError;
}
export interface EventedReportingActionSaveReport extends EventedReportingAction {
  event: EventedReportingActionEvent & { action: typeof EVENT_ACTION_EXECUTE_SAVE };
}
