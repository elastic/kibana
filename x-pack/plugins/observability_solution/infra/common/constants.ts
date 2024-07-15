/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const METRICS_INDEX_PATTERN = 'metrics-*,metricbeat-*';
export const LOGS_INDEX_PATTERN = 'logs-*,filebeat-*,kibana_sample_data_logs*';
export const METRICS_APP = 'metrics';
export const LOGS_APP = 'logs';

export const METRICS_FEATURE_ID = 'infrastructure';
export const INFRA_ALERT_FEATURE_ID = 'infrastructure';
export const LOGS_FEATURE_ID = 'logs';

export type InfraFeatureId = typeof METRICS_FEATURE_ID | typeof LOGS_FEATURE_ID;

export const TIMESTAMP_FIELD = '@timestamp';
export const MESSAGE_FIELD = 'message';
export const TIEBREAKER_FIELD = '_doc';
export const HOST_FIELD = 'host.name';
export const CONTAINER_FIELD = 'container.id';
export const POD_FIELD = 'kubernetes.pod.uid';
export const CMDLINE_FIELD = 'system.process.cmdline';
export const HOST_NAME_FIELD = 'host.name';

export const O11Y_AAD_FIELDS = [
  'cloud.*',
  'host.*',
  'orchestrator.*',
  'container.*',
  'labels.*',
  'tags',
];

export const LINK_TO_INVENTORY = '/app/metrics/link-to/inventory';
export const METRICS_EXPLORER_URL = '/app/metrics/explorer';
export const fifteenMinutesInMilliseconds = 15 * 60 * 1000;

export const DEFAULT_METRICS_VIEW_ATTRIBUTES = {
  name: 'Metrics View',
  timeFieldName: TIMESTAMP_FIELD,
};

export const SNAPSHOT_API_MAX_METRICS = 20;
