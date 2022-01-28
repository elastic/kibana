/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { ReportDocument } from '../../../common/types';
export { Report } from './report';
export { SavedReport } from './saved_report';
export { ReportingStore } from './store';
export { IlmPolicyManager } from './ilm_policy_manager';

export interface IReport {
  _id?: string;
  jobtype: string;
  created_by: string | false;
  payload: { browserTimezone: string };
}
