/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SchemaChildValue, SchemaObject } from '@elastic/ebt';
import { DATA_DATASETS_INDEX_PATTERNS_UNIQUE } from '@kbn/telemetry-plugin/server/telemetry_collection/get_data_telemetry/constants';

import {
  DatasetIndexPattern,
  LogsDataTelemetryEventTypes,
  LogsDataTelemetryEvent,
  DataTelemetryEvent,
} from './types';

export const LOGS_DATA_TELEMETRY_TASK_TYPE = 'logs-data-telemetry';
export const LOGS_DATA_TELEMETRY_TASK_ID = 'logs-data-telemetry:collect-and-report-task-2';

export const TELEMETRY_TASK_INTERVAL = 24 * 60; // 24 hours (in minutes)
export const TELEMETRY_TASK_TIMEOUT = 10; // 10 minutes

export const BREATHE_DELAY_SHORT = 1000; // 1 seconds
export const BREATHE_DELAY_MEDIUM = 5 * 1000; // 5 seconds

export const MAX_STREAMS_TO_REPORT = 1000;

export const NON_LOG_SIGNALS = ['metrics', 'traces', 'internal', 'synthetics'];
export const EXCLUDE_ELASTIC_LOGS = ['logs-synth', 'logs-elastic', 'logs-endpoint'];

const LOGS_INDEX_PATTERN_NAMES = [
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

const structureLevelSchema: SchemaObject<DataTelemetryEvent['structure_level']> = {
  properties: {
    '0': {
      type: 'integer',
      _meta: {
        description: 'Total docs at structure level 0',
      },
    },
    '1': {
      type: 'integer',
      _meta: {
        description: 'Total docs at structure level 1',
      },
    },
    '2': {
      type: 'integer',
      _meta: {
        description: 'Total docs at structure level 2',
      },
    },
    '3': {
      type: 'integer',
      _meta: {
        description: 'Total docs at structure level 3',
      },
    },
    '4': {
      type: 'integer',
      _meta: {
        description: 'Total docs at structure level 4',
      },
    },
    '5': {
      type: 'integer',
      _meta: {
        description: 'Total docs at structure level 5',
      },
    },
    '6': {
      type: 'integer',
      _meta: {
        description: 'Total docs at structure level 6',
      },
    },
  },
};

export const logsDataTelemetryEventSchema: LogsDataTelemetryEvent = {
  eventType: LogsDataTelemetryEventTypes.LogsDataTelemetryEvent,
  schema: {
    pattern_name: {
      type: 'keyword',
      _meta: { description: 'Logs pattern name representing the stream of logs' },
    },
    shipper: {
      type: 'keyword',
      _meta: { description: 'Shipper if present, sending the logs', optional: true },
    },
    doc_count: {
      type: 'integer',
      _meta: { description: 'Total number of documents in the steam of logs' },
    },
    structure_level: structureLevelSchema,
    failure_store_doc_count: {
      type: 'integer',
      _meta: {
        description: 'Total number of documents in the failure store in the stream of logs',
      },
    },
    index_count: {
      type: 'integer',
      _meta: {
        description: 'Total number of indices in the stream of logs',
      },
    },
    namespace_count: {
      type: 'integer',
      _meta: {
        description: 'Total number of namespaces in the stream of logs',
      },
    },
    field_count: {
      type: 'integer',
      _meta: {
        description: 'Total number of fields in mappings of indices of the stream of logs',
      },
    },
    field_existence: {
      properties: DATA_TELEMETRY_FIELDS.reduce((acc, field) => {
        acc[field] = {
          type: 'integer',
          _meta: { description: `Count of docs having field "${field}" mapped` },
        };
        return acc;
      }, {} as Record<string, SchemaChildValue<number>>),
    },
    size_in_bytes: {
      type: 'long',
      _meta: {
        description: 'Total size in bytes of the stream of logs',
      },
    },
    managed_by: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'Value captured in _meta.managed_by',
        },
      },
      _meta: {
        description: 'List of managed by values present in _meta.managed_by of mappings',
      },
    },
    package_name: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'Value captured in _meta.package.name',
        },
      },
      _meta: {
        description: 'List of package name values present in _meta.package.name of mappings',
      },
    },
    beat: {
      type: 'array',
      items: { type: 'keyword', _meta: { description: 'Value captured in _meta.beat.name' } },
      _meta: { description: 'List of beat values present in _meta.beat.name of mappings' },
    },
  },
};
