/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ENTITY_BASE_PREFIX = 'entities';
export const ENTITY_SCHEMA_VERSION_V1 = 'v1';
export const ENTITY_HISTORY = 'history';
export const ENTITY_LATEST = 'latest';
export const ENTITY_INDEX_PREFIX = `.${ENTITY_BASE_PREFIX}`;

// Transform constants
export const ENTITY_DEFAULT_HISTORY_FREQUENCY = '1m';
export const ENTITY_DEFAULT_HISTORY_SYNC_DELAY = '60s';
export const ENTITY_DEFAULT_LATEST_FREQUENCY = '30s';
export const ENTITY_DEFAULT_LATEST_SYNC_DELAY = '1s';
export const ENTITY_DEFAULT_METADATA_LIMIT = 1000;

// API route constants
export const ENTITY_API_PREFIX = '/api/entities';
export const ENTITY_INTERNAL_API_PREFIX = '/internal/api/entities';
export const MANAGED_ENTITY_ENABLEMENT_ROUTE = `${ENTITY_INTERNAL_API_PREFIX}/managed/enablement`;
