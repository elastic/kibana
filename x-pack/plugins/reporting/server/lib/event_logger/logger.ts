/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepMerge from 'deepmerge';
import { IEventLogger, IEventLogService } from '../../../../event_log/server';
import { ConcreteTaskInstance } from '../../../../task_manager/server';
import { PLUGIN_ID } from '../../../common/constants';
import { IReport } from '../store';
import { ActionType } from './';
import {
  ClaimedTask,
  CompletedExecution,
  ErrorAction,
  ExecuteError,
  FailedReport,
  SavedReport,
  ScheduledRetry,
  ScheduledTask,
  StartedExecution,
} from './types';

/** @internal */
export function reportingEventLoggerFactory(eventLog: IEventLogService) {
  const genericLogger = eventLog.getLogger({ event: { provider: PLUGIN_ID } });

  return class ReportingEventLogger {
    readonly eventObj: {
      event: {
        timezone: string;
        provider: 'reporting';
      };
      kibana: { reporting: StartedExecution['kibana']['reporting']; task?: { id: string } };
      log: { logger: 'reporting' };
      user?: { name: string };
    };

    completionLogger: IEventLogger;

    constructor(report: IReport, task?: ConcreteTaskInstance) {
      this.eventObj = {
        event: { timezone: report.payload.browserTimezone, provider: 'reporting' },
        kibana: {
          reporting: { id: report._id, jobType: report.jobtype },
          ...(task?.id ? { task: { id: task.id } } : undefined),
        },
        log: { logger: 'reporting' },
        user: report.created_by ? { name: report.created_by } : undefined,
      };

      // create a "complete" logger that will use EventLog helpers to calculate timings
      this.completionLogger = eventLog.getLogger({ event: { provider: PLUGIN_ID } });
    }

    logScheduleTask(message: string): ScheduledTask {
      const event = deepMerge(
        {
          message,
          event: { kind: 'event', action: ActionType.SCHEDULE_TASK },
          log: { level: 'info' },
        } as Partial<ScheduledTask>,
        this.eventObj
      );

      genericLogger.logEvent(event);
      return event;
    }

    logExecutionStart(message: string): StartedExecution {
      this.completionLogger.startTiming(this.eventObj);
      const event = deepMerge(
        {
          message,
          event: { kind: 'event', action: ActionType.EXECUTE_START },
          log: { level: 'info' },
        } as Partial<StartedExecution>,
        this.eventObj
      );

      genericLogger.logEvent(event);
      return event;
    }

    logExecutionComplete(message: string, byteSize: number): CompletedExecution {
      this.completionLogger.stopTiming(this.eventObj);
      const event = deepMerge(
        {
          message,
          event: {
            kind: 'metrics',
            outcome: 'success',
            action: ActionType.EXECUTE_COMPLETE,
          },
          kibana: { reporting: { byteSize } },
          log: { level: 'info' },
        } as Partial<CompletedExecution>,
        this.eventObj
      );
      this.completionLogger.logEvent(event);
      return event;
    }

    logError(error: ErrorAction): ExecuteError {
      interface LoggedErrorMessage {
        message: string;
        error: ExecuteError['error'];
        event: Omit<ExecuteError['event'], 'provider' | 'id' | 'timezone'>;
        log: Omit<ExecuteError['log'], 'logger'>;
      }
      const logErrorMessage: LoggedErrorMessage = {
        message: error.message,
        error: {
          message: error.message,
          code: error.code,
          stack_trace: error.stack_trace,
          type: error.type,
        },
        event: {
          kind: 'error',
          outcome: 'failure',
          action: ActionType.EXECUTE_COMPLETE,
        },
        log: { level: 'error' },
      };
      const event = deepMerge(logErrorMessage, this.eventObj);
      genericLogger.logEvent(event);
      return event;
    }

    logClaimTask(message: string): ClaimedTask {
      const event = deepMerge(
        {
          message,
          event: { kind: 'event', action: ActionType.CLAIM_TASK },
          log: { level: 'info' },
        } as Partial<ClaimedTask>,
        this.eventObj
      );

      genericLogger.logEvent(event);
      return event;
    }

    logReportFailure(message: string): FailedReport {
      const event = deepMerge(
        {
          message,
          event: { kind: 'event', action: ActionType.FAIL_REPORT },
          log: { level: 'info' },
        } as Partial<FailedReport>,
        this.eventObj
      );

      genericLogger.logEvent(event);
      return event;
    }

    logReportSaved(message: string): SavedReport {
      const event = deepMerge(
        {
          message,
          event: { kind: 'event', action: ActionType.SAVE_REPORT },
          log: { level: 'info' },
        } as Partial<SavedReport>,
        this.eventObj
      );

      genericLogger.logEvent(event);
      return event;
    }

    logRetry(message: string): ScheduledRetry {
      const event = deepMerge(
        {
          message,
          event: { kind: 'event', action: ActionType.RETRY },
          log: { level: 'info' },
        } as Partial<ScheduledRetry>,
        this.eventObj
      );

      genericLogger.logEvent(event);
      return event;
    }
  };
}

export type ReportingEventLogger = ReturnType<typeof reportingEventLoggerFactory>;
