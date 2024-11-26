/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collectValuesWithLength } from '../definition_utils';
import type { UnitedDefinitionBuilder } from '../types';

export const HOST_DEFINITION_VERSION = '1.0.0';
export const getHostUnitedDefinition: UnitedDefinitionBuilder = (fieldHistoryLength: number) => {
  const collect = collectValuesWithLength(fieldHistoryLength);
  return {
    entityType: 'host',
    version: HOST_DEFINITION_VERSION,
    fields: [
      collect({ field: 'host.domain' }),
      collect({ field: 'host.hostname' }),
      collect({ field: 'host.id' }),
      collect({
        field: 'host.os.name',
        mapping: {
          type: 'keyword',
          fields: {
            text: {
              type: 'match_only_text',
            },
          },
        },
      }),
      collect({ field: 'host.os.type' }),
      collect({
        field: 'host.ip',
        mapping: {
          type: 'ip',
        },
      }),
      collect({ field: 'host.mac' }),
      collect({ field: 'host.type' }),
      collect({ field: 'host.architecture' }),
    ],
  };
};
