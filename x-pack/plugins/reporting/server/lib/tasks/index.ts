/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskRunCreatorFunction } from '@kbn/task-manager-plugin/server';
import { BasePayload, ReportSource } from '@kbn/reporting-common/types';

export const REPORTING_EXECUTE_TYPE = 'report:execute';

export const TIME_BETWEEN_ATTEMPTS = 10 * 1000; // 10 seconds

export { ExecuteReportTask } from './execute_report';

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
