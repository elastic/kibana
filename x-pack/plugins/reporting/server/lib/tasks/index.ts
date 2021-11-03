/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskRunCreatorFunction } from '../../../../task_manager/server';
import { ReportSource, TaskRunResult } from '../../../common/types';
import { BasePayload } from '../../types';

export const REPORTING_EXECUTE_TYPE = 'report:execute';
export const REPORTING_MONITOR_TYPE = 'reports:monitor';

export { ExecuteReportTask } from './execute_report';
export { MonitorReportsTask } from './monitor_reports';
export type { TaskRunResult };

export interface ReportTaskParams<JobPayloadType = BasePayload> {
  id: string;
  index: string;
  payload: JobPayloadType;
  created_at: ReportSource['created_at'];
  created_by: ReportSource['created_by'];
  jobtype: ReportSource['jobtype'];
  attempts: ReportSource['attempts'];
  meta: ReportSource['meta'];
}

export enum ReportingTaskStatus {
  UNINITIALIZED = 'uninitialized',
  INITIALIZED = 'initialized',
}

export interface ReportingTask {
  getTaskDefinition: () => {
    type: string;
    title: string;
    createTaskRunner: TaskRunCreatorFunction;
    maxAttempts: number;
    timeout: string;
  };
  getStatus: () => ReportingTaskStatus;
}
