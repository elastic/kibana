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
export { TaskRunResult };

/*
 * The document created by Reporting to store as task parameters for Task
 * Manager to reference the report in .reporting
 */
export interface ReportTaskParams<JobPayloadType = BasePayload> {
  id: string;
  index?: string; // For ad-hoc, which as an existing "pending" record
  payload: JobPayloadType;
  created_at: ReportSource['created_at'];
  created_by: ReportSource['created_by'];
  jobtype: ReportSource['jobtype'];
  attempts: ReportSource['attempts'];
  meta: ReportSource['meta'];
}

export interface ReportingExecuteTaskInstance /* extends TaskInstanceWithDeprecatedFields */ {
  state: object;
  taskType: string;
  params: ReportTaskParams;
  runAt?: Date;
}

export interface ReportingTask {
  getTaskDefinition: () => {
    type: string;
    title: string;
    createTaskRunner: TaskRunCreatorFunction;
    maxAttempts: number;
    timeout: string;
  };
}
