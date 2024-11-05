/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const EntityStoreResource = {
  ENTITY_ENGINE: 'entity_engine',
  ENTITY_DEFINITION: 'entity_definition',
  ENTITY_INDEX: 'entity_index',
  INDEX_COMPONENT_TEMPLATE: 'index_component_template',
  PLATFORM_PIPELINE: 'platform_pipeline',
  FIELD_RETENTION_ENRICH_POLICY: 'field_retention_enrich_policy',
  FIELD_RETENTION_ENRICH_POLICY_TASK: 'field_retention_enrich_policy_task',
} as const;

export type EntityStoreResource = (typeof EntityStoreResource)[keyof typeof EntityStoreResource];
