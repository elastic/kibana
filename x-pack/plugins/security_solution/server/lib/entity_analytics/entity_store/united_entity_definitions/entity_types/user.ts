/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { collectValuesWithLength } from '../definition_utils';
import type { UnitedDefinitionBuilder } from '../types';

export const USER_DEFINITION_VERSION = '1.0.0';
export const getUserUnitedDefinition: UnitedDefinitionBuilder = (fieldHistoryLength: number) => {
  const collect = collectValuesWithLength(fieldHistoryLength);
  return {
    entityType: 'user',
    version: USER_DEFINITION_VERSION,
    fields: [
      collect({ field: 'user.domain' }),
      collect({ field: 'user.email' }),
      collect({
        field: 'user.full_name',
        mapping: {
          type: 'keyword',
          fields: {
            text: {
              type: 'match_only_text',
            },
          },
        },
      }),
      collect({ field: 'user.hash' }),
      collect({ field: 'user.id' }),
      collect({ field: 'user.roles' }),
    ],
  };
};
