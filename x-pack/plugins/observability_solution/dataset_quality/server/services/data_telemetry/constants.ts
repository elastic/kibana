/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATA_DATASETS_INDEX_PATTERNS_UNIQUE } from '@kbn/telemetry-plugin/server/telemetry_collection/get_data_telemetry/constants';

import { DatasetIndexPattern } from './types';

export const LOGS_DATA_TELEMETRY_TASK_TYPE = 'logs-data-telemetry';
export const LOGS_DATA_TELEMETRY_TASK_ID = 'logs-data-telemetry:collect-and-report-task-2';

export const TELEMETRY_TASK_INTERVAL = 24 * 60; // 24 hours (in minutes)
export const TELEMETRY_TASK_TIMEOUT = 10; // 10 minutes

export const BREATHE_DELAY_SHORT = 1000; // 1 seconds
export const BREATHE_DELAY_MEDIUM = 5 * 1000; // 5 seconds

export const MAX_STREAMS_TO_REPORT = 1000;

export const NON_LOG_SIGNALS = ['metrics', 'traces', 'internal', 'synthetics'];
export const EXCLUDE_ELASTIC_LOGS = ['logs-synth', 'logs-elastic', 'logs-endpoint'];

export const TELEMETRY_CHANNEL = 'logs-data-telemetry';

type ObsPatternName = (typeof DATA_DATASETS_INDEX_PATTERNS_UNIQUE)[number]['patternName'];
const LOGS_INDEX_PATTERN_NAMES: ObsPatternName[] = [
  'filebeat',
  'generic-filebeat',
  'metricbeat',
  'generic-metricbeat',
  'apm',
  'functionbeat',
  'generic-functionbeat',
  'heartbeat',
  'generic-heartbeat',
  'logstash',
  'generic-logstash',
  'fluentd',
  'telegraf',
  'prometheusbeat',
  'fluentbit',
  'nginx',
  'apache',
  'dsns-logs',
  'generic-logs',
];

const TELEMETRY_PATTERNS_BY_NAME = DATA_DATASETS_INDEX_PATTERNS_UNIQUE.reduce((acc, pattern) => {
  acc[pattern.patternName] = [pattern, ...(acc[pattern.patternName] || [])];
  return acc;
}, {} as Record<string, DatasetIndexPattern[]>);

export const LOGS_DATASET_INDEX_PATTERNS = LOGS_INDEX_PATTERN_NAMES.flatMap<DatasetIndexPattern>(
  (patternName) => TELEMETRY_PATTERNS_BY_NAME[patternName] || []
);

export const LEVEL_2_RESOURCE_FIELDS = [
  'host.name',
  'service.name',
  'host',
  'hostname',
  'host_name',
];

export const PROMINENT_LOG_ECS_FIELDS = [
  'log.level',
  'log.logger',
  'log.origin.file.name',
  'log.origin.function',
  'log.origin.file.line',
  'event.action',
  'event.category',
  'event.dataset',
  'event.kind',
  'log.file.path',
];

export const DATA_TELEMETRY_FIELDS = [
  'container.id',
  'log.level',
  'container.name',
  'host.name',
  'host.hostname',
  'kubernetes.pod.name',
  'kubernetes.pod.uid',
  'cloud.provider',
  'agent.type',
  'event.dataset',
  'event.category',
  'event.module',
  'service.name',
  'service.type',
  'service.version',
  'message',
  'event.original',
  'error.message',
  '@timestamp',
  'data_stream.dataset',
  'data_stream.namespace',
  'data_stream.type',
];
