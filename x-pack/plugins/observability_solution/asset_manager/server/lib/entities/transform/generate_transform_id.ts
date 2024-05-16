/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import { ENTITY_TRANSFORM_PREFIX } from '../../../../common/constants_entities';

export function generateTransformId(definition: EntityDefinition) {
  return `${ENTITY_TRANSFORM_PREFIX}-${definition.id}`;
}
