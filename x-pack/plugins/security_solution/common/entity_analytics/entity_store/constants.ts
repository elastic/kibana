/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType, IdField } from '../../api/entity_analytics';
import { EntityTypeEnum } from '../../api/entity_analytics';

/**
 * Entity Store routes
 */

export const ENTITY_STORE_URL = '/api/entity_store' as const;
export const ENTITY_STORE_INTERNAL_PRIVILEGES_URL = `${ENTITY_STORE_URL}/privileges` as const;
export const ENTITIES_URL = `${ENTITY_STORE_URL}/entities` as const;
export const LIST_ENTITIES_URL = `${ENTITIES_URL}/list` as const;

export const ENTITY_STORE_REQUIRED_ES_CLUSTER_PRIVILEGES = [
  'manage_index_templates',
  'manage_transform',
  'manage_ingest_pipelines',
  'manage_enrich',
];

// The index pattern for the entity store has to support '.entities.v1.latest.noop' index
export const ENTITY_STORE_INDEX_PATTERN = '.entities.v1.latest.*';

export const IDENTITY_FIELD_MAP: Record<EntityType, IdField> = {
  [EntityTypeEnum.host]: 'host.name',
  [EntityTypeEnum.user]: 'user.name',
  [EntityTypeEnum.service]: 'service.name',
};

export const getAvailableEntityTypes = (): EntityType[] =>
  Object.keys(EntityTypeEnum) as EntityType[];
