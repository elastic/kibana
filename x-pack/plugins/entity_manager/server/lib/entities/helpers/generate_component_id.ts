/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_BASE_PREFIX,
  ENTITY_HISTORY,
  ENTITY_INSTANCE,
  ENTITY_LATEST,
  ENTITY_SCHEMA_VERSION_V1,
  EntityDefinition,
  entitiesIndexPattern,
} from '@kbn/entities-schema';
import {
  ENTITY_HISTORY_PREFIX_V1,
  ENTITY_LATEST_PREFIX_V1,
} from '../../../../common/constants_entities';

// History
function generateHistoryId(definition: EntityDefinition) {
  return `${ENTITY_HISTORY_PREFIX_V1}-${definition.id}` as const;
}

// History Backfill
export function generateHistoryBackfillTransformId(definition: EntityDefinition) {
  return `${ENTITY_HISTORY_PREFIX_V1}-backfill-${definition.id}` as const;
}

export const generateHistoryTransformId = generateHistoryId;
export const generateHistoryIngestPipelineId = generateHistoryId;

export function generateHistoryIndexName(definition: EntityDefinition) {
  return entitiesIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V1,
    dataset: ENTITY_HISTORY,
    definitionId: definition.id,
  });
}

export function generateHistoryIndexTemplateId(definition: EntityDefinition) {
  return `${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V1}_${ENTITY_HISTORY}_${definition.id}_index_template` as const;
}

// Latest
function generateLatestId(definition: EntityDefinition) {
  return `${ENTITY_LATEST_PREFIX_V1}-${definition.id}` as const;
}

export const generateLatestTransformId = generateLatestId;
export const generateLatestIngestPipelineId = generateLatestId;

export function generateLatestIndexName(definition: EntityDefinition) {
  return entitiesIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V1,
    dataset: ENTITY_LATEST,
    definitionId: definition.id,
  });
}

export const generateLatestIndexTemplateId = (definition: EntityDefinition) =>
  `${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V1}_${ENTITY_LATEST}_${definition.id}_index_template` as const;

export const generateInstanceIndexTemplateId = (definition: EntityDefinition) =>
  `${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V1}_${ENTITY_INSTANCE}_${definition.id}_index_template` as const;

export function generateApiKeyId(id: string) {
  return `API-KEY:${id}`;
}
