/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum API_URLS {
  DYNAMIC_SETTINGS = `/api/uptime/settings`,
  INDEX_STATUS = '/internal/uptime/index_status',
  MONITOR_LIST = `/internal/uptime/monitor/list`,
  MONITOR_LOCATIONS = `/internal/uptime/monitor/locations`,
  MONITOR_DURATION = `/internal/uptime/monitor/duration`,
  MONITOR_DETAILS = `/internal/uptime/monitor/details`,
  MONITOR_STATUS = `/internal/uptime/monitor/status`,
  NETWORK_EVENTS = `/internal/uptime/network_events`,
  PINGS = '/internal/uptime/pings',
  PING_HISTOGRAM = `/internal/uptime/ping/histogram`,
  SNAPSHOT_COUNT = `/internal/uptime/snapshot/count`,
  SYNTHETICS_SUCCESSFUL_CHECK = `/internal/uptime/synthetics/check/success`,
  JOURNEY = `/internal/uptime/journey/{checkGroup}`,
  JOURNEY_FAILED_STEPS = `/internal/uptime/journeys/failed_steps`,
  JOURNEY_SCREENSHOT = `/internal/uptime/journey/screenshot/{checkGroup}/{stepIndex}`,
  JOURNEY_SCREENSHOT_BLOCKS = `/internal/uptime/journey/screenshot/block`,

  ML_MODULE_JOBS = `/internal/ml/modules/jobs_exist/`,
  ML_SETUP_MODULE = '/internal/ml/modules/setup/',
  ML_DELETE_JOB = `/internal/ml/jobs/delete_jobs`,
  ML_CAPABILITIES = '/internal/ml/ml_capabilities',
  ML_ANOMALIES_RESULT = `/internal/ml/results/anomalies_table_data`,

  RULE_CONNECTORS = '/api/actions/connectors',
  CREATE_RULE = '/api/alerting/rule',
  DELETE_RULE = '/api/alerting/rule/',
  RULES_FIND = '/api/alerting/rules/_find',
  CONNECTOR_TYPES = '/api/actions/connector_types',

  SYNTHETICS_HAS_INTEGRATION_MONITORS = '/internal/synthetics/fleet/has_integration_monitors',
}
