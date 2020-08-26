/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum API_URLS {
  CERTS = '/api/uptime/certs',
  INDEX_PATTERN = `/api/uptime/index_pattern`,
  INDEX_STATUS = '/api/uptime/index_status',
  MONITOR_LIST = `/api/uptime/monitor/list`,
  MONITOR_LOCATIONS = `/api/uptime/monitor/locations`,
  MONITOR_DURATION = `/api/uptime/monitor/duration`,
  MONITOR_DETAILS = `/api/uptime/monitor/details`,
  MONITOR_STATUS = `/api/uptime/monitor/status`,
  PINGS = '/api/uptime/pings',
  PING_HISTOGRAM = `/api/uptime/ping/histogram`,
  SNAPSHOT_COUNT = `/api/uptime/snapshot/count`,
  FILTERS = `/api/uptime/filters`,
  LOG_PAGE_VIEW = `/api/uptime/log_page_view`,

  ML_MODULE_JOBS = `/api/ml/modules/jobs_exist/`,
  ML_SETUP_MODULE = '/api/ml/modules/setup/',
  ML_DELETE_JOB = `/api/ml/jobs/delete_jobs`,
  ML_CAPABILITIES = '/api/ml/ml_capabilities',
  ML_ANOMALIES_RESULT = `/api/ml/results/anomalies_table_data`,
  ALERT = '/api/alerts/alert/',
  ALERTS_FIND = '/api/alerts/_find',
}
