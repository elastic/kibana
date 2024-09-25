/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import { BUILT_IN_ID_PREFIX } from '../built_in';

export function isBuiltinDefinition(definition: EntityDefinition) {
  return definition.id.startsWith(BUILT_IN_ID_PREFIX);
}
