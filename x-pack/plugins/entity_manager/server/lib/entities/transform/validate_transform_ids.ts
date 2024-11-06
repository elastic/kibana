/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import { EntityDefinitionIdInvalid } from '../errors/entity_definition_id_invalid';
import { generateLatestTransformId } from '../helpers/generate_component_id';

const TRANSFORM_ID_MAX_LENGTH = 64;

export function validateDefinitionCanCreateValidTransformIds(definition: EntityDefinition) {
  const latestTransformId = generateLatestTransformId(definition);

  const spareChars = TRANSFORM_ID_MAX_LENGTH - latestTransformId.length;

  if (spareChars < 0) {
    throw new EntityDefinitionIdInvalid(
      `Entity definition ID is too long (max = ${
        definition.id.length + spareChars
      }); the resulting transform ID will be invalid`
    );
  }

  const transformIdRegex = /^[a-z0-9][a-z0-9_-]*[a-z0-9]$/;
  if (!transformIdRegex.test(definition.id)) {
    throw new EntityDefinitionIdInvalid(
      'Entity definition ID must contain only lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores. It must also start and end with alphanumeric characters.'
    );
  }
}
