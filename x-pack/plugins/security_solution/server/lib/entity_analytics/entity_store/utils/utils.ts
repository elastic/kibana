/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
import type {
  EngineDescriptor,
  EntityType,
} from '../../../../../common/api/entity_analytics/entity_store/common.gen';
import { HOST_ENTITY_DEFINITION, USER_ENTITY_DEFINITION } from '../definition';
import { entityEngineDescriptorTypeName } from '../saved_object';

export const getEntityDefinition = (entityType: EntityType) => {
  if (entityType === 'host') return HOST_ENTITY_DEFINITION;
  if (entityType === 'user') return USER_ENTITY_DEFINITION;

  throw new Error(`Unsupported entity type: ${entityType}`);
};

export const ensureEngineExists =
  (entityType: EntityType) => (results: SavedObjectsFindResponse<EngineDescriptor>) => {
    if (results.total === 0) {
      throw new Error(`Entity engine for ${entityType} does not exist`);
    }
    return results.saved_objects[0].attributes;
  };

export const getByEntityTypeQuery = (entityType: EntityType) => {
  return `${entityEngineDescriptorTypeName}.attributes.type: ${entityType}`;
};

export const getEntitiesIndexName = (entityType: EntityType) => {
  return `.entities.v1.latest.ea_${entityType}_entity_store`;
};
