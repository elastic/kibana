/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_BASE_PREFIX,
  ENTITY_INSTANCE,
  ENTITY_SCHEMA_VERSION_V1,
  entitiesIndexPattern,
} from '@kbn/entities-schema';
import { ApiScraperDefinition } from '../../../../common/types';

export function generateInstanceIndexName(definition: ApiScraperDefinition) {
  return entitiesIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V1,
    dataset: ENTITY_INSTANCE,
    definitionId: definition.id,
  });
}

export const generateInstanceIndexTemplateId = (definition: ApiScraperDefinition) =>
  `${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V1}_${ENTITY_INSTANCE}_${definition.id}_index_template` as const;
