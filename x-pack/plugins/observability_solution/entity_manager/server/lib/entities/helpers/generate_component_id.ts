/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import {
  ENTITY_BASE_PREFIX,
  ENTITY_LATEST,
  ENTITY_HISTORY,
  ENTITY_SCHEMA_VERSION_V1,
} from '../../../../common/constants_entities';

export function generateLatestId(definition: EntityDefinition) {
  return `${ENTITY_BASE_PREFIX}-${ENTITY_SCHEMA_VERSION_V1}-${ENTITY_LATEST}-${definition.id}`;
}

export function generateHistoryId(definition: EntityDefinition) {
  return `${ENTITY_BASE_PREFIX}-${ENTITY_SCHEMA_VERSION_V1}-${ENTITY_HISTORY}-${definition.id}`;
}
