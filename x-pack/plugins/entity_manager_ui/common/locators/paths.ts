/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ENTITY_MANAGER_BASE_PATH = '/app/entity_manager' as const;
export const ENTITY_MANAGER_OVERVIEW = '/' as const;
export const ENTITY_MANAGER_CREATE = '/create' as const;
export const ENTITY_MANAGER_DETAIL = '/:entityId' as const;

export const paths = {
  entities: `${ENTITY_MANAGER_BASE_PATH}${ENTITY_MANAGER_OVERVIEW}`,
  entitiesCreate: `${ENTITY_MANAGER_BASE_PATH}${ENTITY_MANAGER_CREATE}`,
  entitieDetail: (id: string) => `${ENTITY_MANAGER_BASE_PATH}/${id}`,
};
