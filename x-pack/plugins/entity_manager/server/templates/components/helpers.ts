/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import { isBuiltinDefinition } from '../../lib/entities/helpers/is_builtin_definition';

export const getCustomLatestTemplateComponents = (definition: EntityDefinition) => {
  if (isBuiltinDefinition(definition)) {
    return [];
  }

  return [
    `${definition.id}@platform`, // @platform goes before so it can be overwritten by custom
    `${definition.id}-latest@platform`,
    `${definition.id}@custom`,
    `${definition.id}-latest@custom`,
  ];
};

export const getCustomHistoryTemplateComponents = (definition: EntityDefinition) => {
  if (isBuiltinDefinition(definition)) {
    return [];
  }

  return [
    `${definition.id}@platform`, // @platform goes before so it can be overwritten by custom
    `${definition.id}-history@platform`,
    `${definition.id}@custom`,
    `${definition.id}-history@custom`,
  ];
};
