/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportTaskParams, ScheduledReportTaskParams } from '../tasks';
import { Report } from './report';

export type { ReportDocument } from '../../../common/types';
export { IlmPolicyManager } from './ilm_policy_manager';
export { Report } from './report';
export { SavedReport } from './saved_report';
export { ReportingStore } from './store';

export function reportFromTask(task: ReportTaskParams | ScheduledReportTaskParams) {
  const reportTask = task as ReportTaskParams;
  return new Report({ ...task, _id: reportTask.id, _index: reportTask.index });
}

export interface IReport {
  _id?: string;
  jobtype: string;
  created_by: string | false;
  payload: { browserTimezone: string };
}
