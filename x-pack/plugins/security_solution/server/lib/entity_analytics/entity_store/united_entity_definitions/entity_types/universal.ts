/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collectValuesWithLength } from '../definition_utils';
import type { UnitedDefinitionBuilder } from '../types';

export const UNIVERSAL_DEFINITION_VERSION = '1.0.0';

export const getUniversalUnitedDefinition: UnitedDefinitionBuilder = (
  fieldHistoryLength: number
) => {
  const collect = collectValuesWithLength(fieldHistoryLength);
  return {
    entityType: 'universal',
    version: UNIVERSAL_DEFINITION_VERSION,
    fields: [collect({ field: 'collected.metadata', sourceField: 'entities.keyword' })],
  };
};
