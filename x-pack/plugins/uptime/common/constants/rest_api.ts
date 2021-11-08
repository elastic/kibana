/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum API_URLS {
  INDEX_STATUS = '/internal/uptime/index_status',
  MONITOR_LIST = `/internal/uptime/monitor/list`,
  MONITOR_LOCATIONS = `/internal/uptime/monitor/locations`,
  MONITOR_DURATION = `/internal/uptime/monitor/duration`,
  MONITOR_DETAILS = `/internal/uptime/monitor/details`,
  MONITOR_STATUS = `/internal/uptime/monitor/status`,
  PINGS = '/internal/uptime/pings',
  PING_HISTOGRAM = `/internal/uptime/ping/histogram`,
  SNAPSHOT_COUNT = `/internal/uptime/snapshot/count`,
  LOG_PAGE_VIEW = `/internal/uptime/log_page_view`,

  ML_MODULE_JOBS = `/api/ml/modules/jobs_exist/`,
  ML_SETUP_MODULE = '/api/ml/modules/setup/',
  ML_DELETE_JOB = `/api/ml/jobs/delete_jobs`,
  ML_CAPABILITIES = '/api/ml/ml_capabilities',
  ML_ANOMALIES_RESULT = `/api/ml/results/anomalies_table_data`,

  RULE_CONNECTORS = '/api/actions/connectors',
  CREATE_RULE = '/api/alerting/rule',
  DELETE_RULE = '/api/alerting/rule/',
  RULES_FIND = '/api/alerting/rules/_find',
  CONNECTOR_TYPES = '/api/actions/connector_types',
}
