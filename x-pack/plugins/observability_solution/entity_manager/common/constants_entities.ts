/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Base constants
export const ENTITY_BASE_PREFIX = 'entities';
export const ENTITY_SCHEMA_VERSION_V1 = 'v1';
export const ENTITY_INDEX_PREFIX = `.${ENTITY_BASE_PREFIX}` as const;
export const ENTITY_INDICES_PATTERN = `${ENTITY_INDEX_PREFIX}*` as const;

export const ENTITY_ENTITY_COMPONENT_TEMPLATE_V1 =
  `${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V1}_entity` as const;
export const ENTITY_EVENT_COMPONENT_TEMPLATE_V1 =
  `${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V1}_event` as const;

// History constants
export const ENTITY_HISTORY = 'history' as const;
export const ENTITY_HISTORY_BASE_COMPONENT_TEMPLATE_V1 =
  `${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V1}_${ENTITY_HISTORY}_base` as const;
export const ENTITY_HISTORY_PREFIX_V1 =
  `${ENTITY_BASE_PREFIX}-${ENTITY_SCHEMA_VERSION_V1}-${ENTITY_HISTORY}` as const;
export const ENTITY_HISTORY_BACKFILL_PREFIX_V1 =
  `${ENTITY_BASE_PREFIX}-${ENTITY_SCHEMA_VERSION_V1}-${ENTITY_HISTORY}-backfill` as const;
export const ENTITY_HISTORY_INDEX_PREFIX_V1 =
  `${ENTITY_INDEX_PREFIX}.${ENTITY_SCHEMA_VERSION_V1}.${ENTITY_HISTORY}` as const;

// Latest constants
export const ENTITY_LATEST = 'latest' as const;
export const ENTITY_LATEST_BASE_COMPONENT_TEMPLATE_V1 =
  `${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V1}_${ENTITY_LATEST}_base` as const;
export const ENTITY_LATEST_PREFIX_V1 =
  `${ENTITY_BASE_PREFIX}-${ENTITY_SCHEMA_VERSION_V1}-${ENTITY_LATEST}` as const;
export const ENTITY_LATEST_INDEX_PREFIX_V1 =
  `${ENTITY_INDEX_PREFIX}.${ENTITY_SCHEMA_VERSION_V1}.${ENTITY_LATEST}` as const;

// Transform constants
export const ENTITY_DEFAULT_HISTORY_FREQUENCY = '1m';
export const ENTITY_DEFAULT_HISTORY_SYNC_DELAY = '60s';
export const ENTITY_DEFAULT_LATEST_FREQUENCY = '30s';
export const ENTITY_DEFAULT_LATEST_SYNC_DELAY = '1s';
export const ENTITY_DEFAULT_METADATA_LIMIT = 1000;
