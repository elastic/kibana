/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SmartFieldGridColumnOptions } from './display_options';

export const LOGS_EXPLORER_PROFILE_ID = 'logs-explorer';

// Fields constants
export const TIMESTAMP_FIELD = '@timestamp';
export const HOST_NAME_FIELD = 'host.name';
export const LOG_LEVEL_FIELD = 'log.level';
export const MESSAGE_FIELD = 'message';
export const ERROR_MESSAGE_FIELD = 'error.message';
export const EVENT_ORIGINAL_FIELD = 'event.original';
export const TRACE_ID_FIELD = 'trace.id';

export const LOG_FILE_PATH_FIELD = 'log.file.path';
export const DATASTREAM_NAMESPACE_FIELD = 'data_stream.namespace';
export const DATASTREAM_DATASET_FIELD = 'data_stream.dataset';

// Resource Fields
export const AGENT_NAME_FIELD = 'agent.name';
export const CLOUD_PROVIDER_FIELD = 'cloud.provider';
export const CLOUD_REGION_FIELD = 'cloud.region';
export const CLOUD_AVAILABILITY_ZONE_FIELD = 'cloud.availability_zone';
export const CLOUD_PROJECT_ID_FIELD = 'cloud.project.id';
export const CLOUD_INSTANCE_ID_FIELD = 'cloud.instance.id';
export const SERVICE_NAME_FIELD = 'service.name';
export const ORCHESTRATOR_CLUSTER_NAME_FIELD = 'orchestrator.cluster.name';
export const ORCHESTRATOR_RESOURCE_ID_FIELD = 'orchestrator.resource.id';
export const ORCHESTRATOR_NAMESPACE_FIELD = 'orchestrator.namespace';
export const CONTAINER_NAME_FIELD = 'container.name';
export const CONTAINER_ID_FIELD = 'container.id';

// Degraded Docs
export const DEGRADED_DOCS_FIELD = 'ignored_field_values';

// Error Stacktrace
export const ERROR_STACK_TRACE = 'error.stack_trace';
export const ERROR_EXCEPTION_STACKTRACE = 'error.exception.stacktrace';
export const ERROR_LOG_STACKTRACE = 'error.log.stacktrace';

// Virtual column fields
export const CONTENT_FIELD = 'content';
export const RESOURCE_FIELD = 'resource';

// Sizing
export const DATA_GRID_COLUMN_WIDTH_SMALL = 240;
export const DATA_GRID_COLUMN_WIDTH_MEDIUM = 320;
export const ACTIONS_COLUMN_WIDTH = 80;

export const RESOURCE_FIELD_CONFIGURATION: SmartFieldGridColumnOptions = {
  type: 'smart-field',
  smartField: RESOURCE_FIELD,
  fallbackFields: [HOST_NAME_FIELD, SERVICE_NAME_FIELD],
  width: DATA_GRID_COLUMN_WIDTH_MEDIUM,
};

export const CONTENT_FIELD_CONFIGURATION: SmartFieldGridColumnOptions = {
  type: 'smart-field',
  smartField: CONTENT_FIELD,
  fallbackFields: [MESSAGE_FIELD],
};

export const SMART_FALLBACK_FIELDS = {
  [CONTENT_FIELD]: CONTENT_FIELD_CONFIGURATION,
  [RESOURCE_FIELD]: RESOURCE_FIELD_CONFIGURATION,
};

// UI preferences
export const DEFAULT_COLUMNS = [RESOURCE_FIELD_CONFIGURATION, CONTENT_FIELD_CONFIGURATION];
export const DEFAULT_ROWS_PER_PAGE = 100;

// List of prefixes which needs to be filtered out for Display in Content Column
export const FILTER_OUT_FIELDS_PREFIXES_FOR_CONTENT = [
  '_', // Filter fields like '_id', '_score'
  '@timestamp',
  'agent.',
  'elastic_agent.',
  'data_stream.',
  'ecs.',
  'host.',
  'container.',
  'cloud.',
  'kubernetes.',
  'orchestrator.',
  'log.',
  'service.',
];

export const DEFAULT_ALLOWED_DATA_VIEWS = ['logs', 'auditbeat', 'filebeat', 'winlogbeat'];
export const DEFAULT_ALLOWED_LOGS_DATA_VIEWS = ['logs', 'auditbeat', 'filebeat', 'winlogbeat'];
