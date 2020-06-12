/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY =
  'xpack.reporting.jobCompletionNotifications';

// Routes
export const API_BASE_URL = '/api/reporting';
export const API_LIST_URL = `${API_BASE_URL}/jobs`;
export const API_BASE_GENERATE = `${API_BASE_URL}/generate`;
export const API_GENERATE_IMMEDIATE = `${API_BASE_URL}/v1/generate/immediate/csv/saved-object`;
export const REPORTING_MANAGEMENT_HOME = '/app/management/insightsAndAlerting/reporting';

// Statuses
export const JOB_STATUS_FAILED = 'failed';
export const JOB_STATUS_COMPLETED = 'completed';
export const JOB_STATUS_WARNINGS = 'completed_with_warnings';

export enum JobStatuses {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  WARNINGS = 'completed_with_warnings',
}

// Types
export const PDF_JOB_TYPE = 'printable_pdf';
export const PNG_JOB_TYPE = 'PNG';
export const CSV_JOB_TYPE = 'csv';
export const CSV_FROM_SAVEDOBJECT_JOB_TYPE = 'csv_from_savedobject';
export const USES_HEADLESS_JOB_TYPES = [PDF_JOB_TYPE, PNG_JOB_TYPE];

// Actions
export const CSV_REPORTING_ACTION = 'downloadCsvReport';
