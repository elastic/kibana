/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LOG_EXPLORER_PROFILE_ID = 'log-explorer';

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

// Virtual column fields
export const CONTENT_FIELD = 'content';
export const RESOURCE_FIELD = 'resource';

// Sizing
export const DATA_GRID_COLUMN_WIDTH_SMALL = 240;
export const DATA_GRID_COLUMN_WIDTH_MEDIUM = 320;

// UI preferences
export const DEFAULT_COLUMNS = [
  {
    field: RESOURCE_FIELD,
    width: DATA_GRID_COLUMN_WIDTH_MEDIUM,
  },
  {
    field: CONTENT_FIELD,
  },
];
export const DEFAULT_ROWS_PER_PAGE = 100;
