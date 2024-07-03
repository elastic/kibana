/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import {
  ENTITY_INDEX_PREFIX,
  ENTITY_SCHEMA_VERSION_V1,
  ENTITY_LATEST,
  ENTITY_HISTORY,
} from '@kbn/entityManager-plugin/common/constants_entities';

export function generateLatestIndexName(definition: EntityDefinition) {
  return `${ENTITY_INDEX_PREFIX}-${ENTITY_SCHEMA_VERSION_V1}-${ENTITY_LATEST}-${definition.id}`;
}

export function generateHistoryIndexName(definition: EntityDefinition) {
  return `${ENTITY_INDEX_PREFIX}-${ENTITY_SCHEMA_VERSION_V1}-${ENTITY_HISTORY}-${definition.id}`;
}
