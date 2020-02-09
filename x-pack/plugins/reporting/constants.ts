/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY =
  'xpack.reporting.jobCompletionNotifications';

export const JOB_COMPLETION_NOTIFICATIONS_POLLER_CONFIG = {
  jobCompletionNotifier: {
    interval: 10000,
    intervalErrorMultiplier: 5,
  },
};

export const API_BASE_URL = '/api/reporting/jobs';
export const REPORTING_MANAGEMENT_HOME = '/app/kibana#/management/kibana/reporting';

export const JOB_STATUS_FAILED = 'failed';
export const JOB_STATUS_COMPLETED = 'completed';
