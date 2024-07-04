/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import {
  ENTITY_HISTORY_INDEX_PREFIX,
  ENTITY_HISTORY_PREFIX,
  ENTITY_LATEST_INDEX_PREFIX,
  ENTITY_LATEST_PREFIX,
} from '../../../../common/constants_entities';

// History
function generateHistoryId(definition: EntityDefinition) {
  return `${ENTITY_HISTORY_PREFIX}-${definition.id}`;
}

export const generateHistoryTransformId = generateHistoryId;
export const generateHistoryPipelineId = generateHistoryId;

export function generateHistoryIndexName(definition: EntityDefinition) {
  return `${ENTITY_HISTORY_INDEX_PREFIX}-${definition.id}`;
}

// Latest
function generateLatestId(definition: EntityDefinition) {
  return `${ENTITY_LATEST_PREFIX}-${definition.id}`;
}

export const generateLatestTransformId = generateLatestId;
export const generateLatestPipelineId = generateLatestId;

export function generateLatestIndexName(definition: EntityDefinition) {
  return `${ENTITY_LATEST_INDEX_PREFIX}-${definition.id}`;
}
