/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const TRANSFORM_ID_MAX_LENGTH = 64;

import { EntityDefinition } from '@kbn/entities-schema';
import { EntityIdTooLong } from '../errors/entity_id_too_long_error';
import { generateHistoryTransformId } from './generate_history_transform_id';
import { generateLatestTransformId } from './generate_latest_transform_id';

export function validateDefinitionCanCreateValidTransformIds(
  definition: EntityDefinition
) {
  const historyTransformId = generateHistoryTransformId(definition);
  const latestTransformId = generateLatestTransformId(definition);

  const spareChars = TRANSFORM_ID_MAX_LENGTH - Math.max(historyTransformId.length, latestTransformId.length);

  if (spareChars < 0) {
    throw new EntityIdTooLong(`Entity definition ID is too long (max = ${definition.id.length + spareChars}); the resulting transform ID will be invalid`);
  }
}
