/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTENT_TYPE_CSV } from '@kbn/generate-csv';

// Routes
export const API_BASE_URL = '/api/reporting'; // "Generation URL" from share menu
export const API_GET_ILM_POLICY_STATUS = `${API_BASE_URL}/ilm_policy_status`;
export const API_MIGRATE_ILM_POLICY_URL = `${API_BASE_URL}/deprecations/migrate_ilm_policy`;

export const API_DIAGNOSE_URL = `${API_BASE_URL}/diagnose`;
export const ILM_POLICY_NAME = 'kibana-reporting';
export const REPORTING_SYSTEM_INDEX = '.reporting';

export const PLUGIN_ID = 'reporting';

export const REPORTING_TRANSACTION_TYPE = PLUGIN_ID;

// Job params require a `version` field as of 7.15.0. For older jobs set with
// automation that have no version value in the job params, we assume the
// intended version is 7.14.0
export const UNVERSIONED_VERSION = '7.14.0';

// Usage counter types
export const API_USAGE_COUNTER_TYPE = 'reportingApi';
export const API_USAGE_ERROR_TYPE = 'reportingApiError';

export const ALLOWED_JOB_CONTENT_TYPES = [
  'application/json',
  'application/pdf',
  CONTENT_TYPE_CSV,
  'image/png',
  'text/plain',
];

// Statuses
export enum JOB_STATUSES {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  WARNINGS = 'completed_with_warnings',
}
