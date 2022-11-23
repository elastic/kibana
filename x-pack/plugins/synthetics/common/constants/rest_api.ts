/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum API_URLS {
  DYNAMIC_SETTINGS = `/internal/uptime/dynamic_settings`,
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

  // Service end points
  INDEX_TEMPLATES = '/internal/uptime/service/index_templates',
  SERVICE_LOCATIONS = '/internal/uptime/service/locations',
  SYNTHETICS_MONITORS = '/internal/uptime/service/monitors',
  SYNTHETICS_ENABLEMENT = '/internal/uptime/service/enablement',
  RUN_ONCE_MONITOR = '/internal/uptime/service/monitors/run_once',
  TRIGGER_MONITOR = '/internal/uptime/service/monitors/trigger',
  SERVICE_ALLOWED = '/internal/uptime/service/allowed',
  SYNTHETICS_APIKEY = '/internal/uptime/service/api_key',
  SYNTHETICS_HAS_ZIP_URL_MONITORS = '/internal/uptime/fleet/has_zip_url_monitors',

  // Project monitor public endpoint
  SYNTHETICS_MONITORS_PROJECT = '/api/synthetics/project/{projectName}/monitors',
  SYNTHETICS_MONITORS_PROJECT_UPDATE = '/api/synthetics/project/{projectName}/monitors/_bulk_update',
  SYNTHETICS_MONITORS_PROJECT_DELETE = '/api/synthetics/project/{projectName}/monitors/_bulk_delete',
  SYNTHETICS_MONITORS_PROJECT_LEGACY = '/api/synthetics/service/project/monitors',
}
