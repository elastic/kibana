/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const TRANSFORM_ID_MAX_LENGTH = 64;

import { EntityDefinition } from '@kbn/entities-schema';
import { generateHistoryTransformId } from './generate_history_transform_id';
import { generateLatestTransformId } from './generate_latest_transform_id';

export function validateDefinitionCanCreateValidTransformIds(
  definition: EntityDefinition
): boolean {
  const historyTransformId = generateHistoryTransformId(definition);
  const latestTransformId = generateLatestTransformId(definition);

  return (
    historyTransformId.length <= TRANSFORM_ID_MAX_LENGTH &&
    latestTransformId.length <= TRANSFORM_ID_MAX_LENGTH
  );
}
