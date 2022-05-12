/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentLogsState } from './agent_logs';

export const AGENT_LOG_INDEX_PATTERN = 'logs-elastic_agent-*,logs-elastic_agent.*-*';
export const AGENT_DATASET = 'elastic_agent';
export const AGENT_DATASET_FILEBEAT = 'elastic_agent.filebeat';
export const AGENT_DATASET_METRICBEAT = 'elastic_agent.metricbeat';
export const AGENT_DATASET_OSQUERYBEAT = 'elastic_agent.osquerybeat';
export const AGENT_DATASET_HEARTBEAT = 'elastic_agent.heartbeat';
export const AGENT_DATASET_APM_SERVER = 'elastic_agent.apm_server';
export const AGENT_DATASET_ENDPOINT_SECURITY = 'elastic_agent.endpoint_security';
export const AGENT_DATASET_PATTERN = 'elastic_agent.*';
export const AGENT_ID_FIELD = {
  name: 'elastic_agent.id',
  type: 'string',
};
export const DATASET_FIELD = {
  name: 'data_stream.dataset',
  type: 'string',
  aggregatable: true,
};
export const LOG_LEVEL_FIELD = {
  name: 'log.level',
  type: 'string',
  aggregatable: true,
};
export const DEFAULT_DATE_RANGE = {
  start: 'now-1d',
  end: 'now',
};
export const DEFAULT_LOGS_STATE: AgentLogsState = {
  start: DEFAULT_DATE_RANGE.start,
  end: DEFAULT_DATE_RANGE.end,
  logLevels: [],
  datasets: [AGENT_DATASET],
  query: '',
};

export const STATE_STORAGE_KEY = '_q';
export const STATE_DATASET_FIELD = 'datasets';

export const AGENT_LOG_LEVELS = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  DEBUG: 'debug',
};

export const ORDERED_FILTER_LOG_LEVELS = ['error', 'warning', 'warn', 'notice', 'info', 'debug'];

export const DEFAULT_LOG_LEVEL = AGENT_LOG_LEVELS.INFO;
