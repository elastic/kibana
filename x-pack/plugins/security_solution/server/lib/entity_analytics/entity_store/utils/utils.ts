/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../../../../../common/api/entity_analytics/entity_store/common.gen';
import { HOST_ENTITY_DEFINITION, USER_ENTITY_DEFINITION } from '../definition';
import { entityEngineDescriptorTypeName } from '../saved_object';

export const getEntityDefinition = (entityType: EntityType, space: string) => {
  if (entityType === 'host')
    return HOST_ENTITY_DEFINITION(buildEntityDefinitionId(entityType, space));
  if (entityType === 'user')
    return USER_ENTITY_DEFINITION(buildEntityDefinitionId(entityType, space));

  throw new Error(`Unsupported entity type: ${entityType}`);
};

export const buildEntityDefinitionId = (entityType: EntityType, space: string) => {
  return `ea_${space}_${entityType}_entity_store`;
};

export const getByEntityTypeQuery = (entityType: EntityType) => {
  return `${entityEngineDescriptorTypeName}.attributes.type: ${entityType}`;
};
