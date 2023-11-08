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
export const SERVICE_NAME_FIELD = 'service.name';

// Sizing
export const DATA_GRID_COLUMN_WIDTH_SMALL = 240;
export const DATA_GRID_COLUMN_WIDTH_MEDIUM = 320;

// UI preferences
export const DATA_GRID_DEFAULT_COLUMNS = [SERVICE_NAME_FIELD, HOST_NAME_FIELD, MESSAGE_FIELD];
export const DATA_GRID_COLUMNS_PREFERENCES = {
  [HOST_NAME_FIELD]: { width: DATA_GRID_COLUMN_WIDTH_MEDIUM },
  [SERVICE_NAME_FIELD]: { width: DATA_GRID_COLUMN_WIDTH_SMALL },
};
