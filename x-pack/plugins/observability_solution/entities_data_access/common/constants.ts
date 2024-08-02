/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ENTITY_BASE_PREFIX = 'entities' as const;
export const ENTITY_HISTORY = 'history' as const;
export const ENTITY_LATEST = 'latest' as const;

export type SchemaVersionString = `v${number}`;
export type DatasetString = typeof ENTITY_LATEST | typeof ENTITY_HISTORY;

export const SO_ENTITY_DEFINITION_TYPE = 'entity-definition';
