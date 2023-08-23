/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTENT_TYPE_CSV } from '@kbn/generate-csv/src/constants';
import * as jobTypes from './job_types';
import * as reportTypes from './report_types';

const { PDF_JOB_TYPE, PDF_JOB_TYPE_V2, PNG_JOB_TYPE, PNG_JOB_TYPE_V2 } = jobTypes;

export const PLUGIN_ID = 'reporting';

export const REPORTING_TRANSACTION_TYPE = PLUGIN_ID;

export const REPORTING_SYSTEM_INDEX = '.reporting';

export const JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY =
  'xpack.reporting.jobCompletionNotifications';

export const ALLOWED_JOB_CONTENT_TYPES = [
  'application/json',
  'application/pdf',
  CONTENT_TYPE_CSV,
  'image/png',
  'text/plain',
];

type ReportTypeDeclaration = typeof reportTypes;
export type ReportTypes = ReportTypeDeclaration[keyof ReportTypeDeclaration];

type JobTypeDeclaration = typeof jobTypes;
export type JobTypes = JobTypeDeclaration[keyof JobTypeDeclaration];

export const CSV_SEARCHSOURCE_IMMEDIATE_TYPE = 'csv_searchsource_immediate';

// This is deprecated because it lacks support for runtime fields
// but the extension points are still needed for pre-existing scripted automation, until 8.0
export const CSV_REPORT_TYPE_DEPRECATED = 'CSV';
export const CSV_JOB_TYPE_DEPRECATED = 'csv';

export const USES_HEADLESS_JOB_TYPES = [
  PDF_JOB_TYPE,
  PNG_JOB_TYPE,
  PDF_JOB_TYPE_V2,
  PNG_JOB_TYPE_V2,
];

export const DEPRECATED_JOB_TYPES = [CSV_JOB_TYPE_DEPRECATED];

// Licenses
export const LICENSE_TYPE_TRIAL = 'trial' as const;
export const LICENSE_TYPE_BASIC = 'basic' as const;
export const LICENSE_TYPE_CLOUD_STANDARD = 'standard' as const;
export const LICENSE_TYPE_GOLD = 'gold' as const;
export const LICENSE_TYPE_PLATINUM = 'platinum' as const;
export const LICENSE_TYPE_ENTERPRISE = 'enterprise' as const;

export const ILM_POLICY_NAME = 'kibana-reporting';

// Usage counter types
export const API_USAGE_COUNTER_TYPE = 'reportingApi';
export const API_USAGE_ERROR_TYPE = 'reportingApiError';

// Management UI route
export const REPORTING_MANAGEMENT_HOME = '/app/management/insightsAndAlerting/reporting';

export const REPORTING_REDIRECT_LOCATOR_STORE_KEY = '__REPORTING_REDIRECT_LOCATOR_STORE_KEY__';

/**
 * A way to get the client side route for the reporting redirect app.
 *
 * TODO: Add a job ID and a locator to use so that we can redirect without expecting state to
 * be injected to the page
 */
export const getRedirectAppPath = () => {
  return '/app/reportingRedirect';
};

// Statuses
export enum JOB_STATUSES {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  WARNINGS = 'completed_with_warnings',
}

// Test Subjects
export const REPORT_TABLE_ID = 'reportJobListing';
export const REPORT_TABLE_ROW_ID = 'reportJobRow';

// Job params require a `version` field as of 7.15.0. For older jobs set with
// automation that have no version value in the job params, we assume the
// intended version is 7.14.0
export const UNVERSIONED_VERSION = '7.14.0';

export * from './job_types';
export * from './report_types';
export * from './routes';
