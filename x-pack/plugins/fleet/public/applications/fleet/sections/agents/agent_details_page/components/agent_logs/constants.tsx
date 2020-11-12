/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export const AGENT_LOG_INDEX_PATTERN = 'logs-elastic_agent-*,logs-elastic_agent.*-*';
export const AGENT_DATASET = 'elastic_agent';
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
