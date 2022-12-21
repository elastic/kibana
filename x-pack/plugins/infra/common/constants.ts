/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_SOURCE_ID = 'default';
export const METRICS_INDEX_PATTERN = 'metrics-*,metricbeat-*';
export const LOGS_INDEX_PATTERN = 'logs-*,filebeat-*,kibana_sample_data_logs*';
export const METRICS_APP = 'metrics';
export const LOGS_APP = 'logs';

export const METRICS_FEATURE_ID = 'infrastructure';
export const LOGS_FEATURE_ID = 'logs';

export type InfraFeatureId = typeof METRICS_FEATURE_ID | typeof LOGS_FEATURE_ID;

export const TIMESTAMP_FIELD = '@timestamp';
export const TIEBREAKER_FIELD = '_doc';
export const HOST_FIELD = 'host.name';
export const CONTAINER_FIELD = 'container.id';
export const POD_FIELD = 'kubernetes.pod.uid';
