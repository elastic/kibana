/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collectValuesWithLength } from '../definition_utils';
import type { UnitedDefinitionBuilder } from '../types';

export const SERVICE_DEFINITION_VERSION = '1.0.0';
export const getServiceUnitedDefinition: UnitedDefinitionBuilder = (fieldHistoryLength: number) => {
  const collect = collectValuesWithLength(fieldHistoryLength);
  return {
    entityType: 'service',
    version: SERVICE_DEFINITION_VERSION,
    fields: [
      collect({ field: 'service.address' }),
      collect({ field: 'service.environment' }),
      collect({ field: 'service.ephemeral_id' }),
      collect({ field: 'service.id' }),
      collect({ field: 'service.node.name' }),
      collect({ field: 'service.node.roles' }),
      collect({ field: 'service.state' }),
      collect({ field: 'service.type' }),
      collect({ field: 'service.version' }),
    ],
  };
};
