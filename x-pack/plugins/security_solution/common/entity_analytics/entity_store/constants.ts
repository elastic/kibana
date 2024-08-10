/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ENTITY_STORE_INTERNAL_URL = `/internal/entity_store` as const;
export const ENTITY_STORE_GET_RELATIONS_URL = `${ENTITY_STORE_INTERNAL_URL}/relations` as const;
export const ENTITY_STORE_CREATE_RELATION_URL = `${ENTITY_STORE_INTERNAL_URL}/relations` as const;

export const ENTITY_STORE_GET_ENTITIES_URL = `${ENTITY_STORE_INTERNAL_URL}/entities` as const;
