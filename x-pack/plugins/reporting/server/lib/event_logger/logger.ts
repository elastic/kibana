/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepMerge from 'deepmerge';
import type { Logger, LogMeta } from 'kibana/server';
import { PLUGIN_ID } from '../../../common/constants';
import type { TaskRunMetrics } from '../../../common/types';
import { IReport } from '../store';
import { ActionType } from './';
import { EcsLogAdapter } from './adapter';
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

export interface ExecutionClaimMetrics extends TaskRunMetrics {
  queueDurationMs: number;
}

export interface ExecutionCompleteMetrics extends TaskRunMetrics {
  byteSize: number;
}

export interface IReportingEventLogger {
  logEvent(message: string, properties: LogMeta): void;
  startTiming(): void;
  stopTiming(): void;
}

export interface BaseEvent {
  event: { timezone: string };
  kibana: {
    reporting: { id?: string; jobType: string };
    task?: { id: string };
  };
  user?: { name: string };
}

export function reportingEventLoggerFactory(logger: Logger) {
  const genericLogger = new EcsLogAdapter(logger, { event: { provider: PLUGIN_ID } });

  return class ReportingEventLogger {
    readonly eventObj: BaseEvent;

    readonly report: IReport;
    readonly task?: { id: string };

    completionLogger: IReportingEventLogger;

    constructor(report: IReport, task?: { id: string }) {
      this.report = report;
      this.task = task;
      this.eventObj = {
        event: { timezone: report.payload.browserTimezone },
        kibana: {
          reporting: { id: report._id, jobType: report.jobtype },
          ...(task?.id ? { task: { id: task.id } } : undefined),
        },
        user: report.created_by ? { name: report.created_by } : undefined,
      };

      // create a "complete" logger that will use EventLog helpers to calculate timings
      this.completionLogger = new EcsLogAdapter(logger, { event: { provider: PLUGIN_ID } });
    }

    logScheduleTask(): ScheduledTask {
      const message = `queued report ${this.report._id}`;
      const event = deepMerge(
        {
          message,
          kibana: { reporting: { actionType: ActionType.SCHEDULE_TASK } },
        } as Partial<ScheduledTask>,
        this.eventObj
      );

      genericLogger.logEvent(message, event);
      return event;
    }

    logExecutionStart(): StartedExecution {
      const message = `starting ${this.report.jobtype} execution`;
      this.completionLogger.startTiming();
      const event = deepMerge(
        {
          message,
          kibana: { reporting: { actionType: ActionType.EXECUTE_START } },
        } as Partial<StartedExecution>,
        this.eventObj
      );

      genericLogger.logEvent(message, event);
      return event;
    }

    logExecutionComplete({
      byteSize,
      csv,
      pdf,
      png,
    }: ExecutionCompleteMetrics): CompletedExecution {
      const message = `completed ${this.report.jobtype} execution`;
      this.completionLogger.stopTiming();
      const event = deepMerge(
        {
          message,
          kibana: {
            reporting: {
              actionType: ActionType.EXECUTE_COMPLETE,
              byteSize,
              csv,
              pdf,
              png,
            },
          },
        } as Partial<CompletedExecution>,
        this.eventObj
      );
      this.completionLogger.logEvent(message, event);
      return event;
    }

    logError(error: ErrorAction): ExecuteError {
      const message = `an error occurred`;
      const logErrorMessage = {
        message,
        kibana: { reporting: { actionType: ActionType.EXECUTE_ERROR } },
        error: {
          message: error.message,
          code: error.code,
          stack_trace: error.stack_trace,
          type: error.type,
        },
      } as Partial<ExecuteError>;
      const event = deepMerge(logErrorMessage, this.eventObj);
      genericLogger.logEvent(message, event);
      return event;
    }

    logClaimTask({ queueDurationMs }: ExecutionClaimMetrics): ClaimedTask {
      const message = `claimed report ${this.report._id}`;
      const queueDurationNs = queueDurationMs * 1000000;
      const event = deepMerge(
        {
          message,
          kibana: { reporting: { actionType: ActionType.CLAIM_TASK } },
          event: { duration: queueDurationNs }, // this field is nanoseconds by ECS definition
        } as Partial<ClaimedTask>,
        this.eventObj
      );

      genericLogger.logEvent(message, event);
      return event;
    }

    logReportFailure(): FailedReport {
      const message = `report ${this.report._id} has failed`;
      const event = deepMerge(
        {
          message,
          kibana: { reporting: { actionType: ActionType.FAIL_REPORT } },
        } as Partial<FailedReport>,
        this.eventObj
      );

      genericLogger.logEvent(message, event);
      return event;
    }

    logReportSaved(): SavedReport {
      const message = `saved report ${this.report._id}`;
      const event = deepMerge(
        {
          message,
          kibana: { reporting: { actionType: ActionType.SAVE_REPORT } },
        } as Partial<SavedReport>,
        this.eventObj
      );

      genericLogger.logEvent(message, event);
      return event;
    }

    logRetry(): ScheduledRetry {
      const message = `scheduled retry for report ${this.report._id}`;
      const event = deepMerge(
        {
          message,
          kibana: { reporting: { actionType: ActionType.RETRY } },
        } as Partial<ScheduledRetry>,
        this.eventObj
      );

      genericLogger.logEvent(message, event);
      return event;
    }
  };
}

export type ReportingEventLogger = ReturnType<typeof reportingEventLoggerFactory>;
