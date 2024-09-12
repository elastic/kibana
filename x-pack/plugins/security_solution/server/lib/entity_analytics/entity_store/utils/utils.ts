/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
import { getAssetCriticalityIndex } from '../../../../../common/entity_analytics/asset_criticality';
import type {
  EngineDescriptor,
  EntityType,
} from '../../../../../common/api/entity_analytics/entity_store/generated/common.gen';
import { HOST_ENTITY_DEFINITION, USER_ENTITY_DEFINITION } from '../definition';
import { entityEngineDescriptorTypeName } from '../saved_object';

export const getEntityDefinition = (entityType: EntityType, spaceId: string = 'default') => {
  // throw if invalid entity type
  const entityDefinition = entityType === 'host' ? HOST_ENTITY_DEFINITION : USER_ENTITY_DEFINITION;

  const assetCriticalityIndex = getAssetCriticalityIndex(spaceId);

  entityDefinition.indexPatterns.push(assetCriticalityIndex);

  return entityDefinition;
};

export const getIdentityFieldForEntityType = (entityType: EntityType) => {
  if (entityType === 'host') return 'host.name';

  return 'user.name';
};

export const ensureEngineExists =
  (entityType: EntityType) => (results: SavedObjectsFindResponse<EngineDescriptor>) => {
    if (results.total === 0) {
      throw new Error(`Entity engine for ${entityType} does not exist`);
    }
    return results.saved_objects[0];
  };

export const getByEntityTypeQuery = (entityType: EntityType) => {
  return `${entityEngineDescriptorTypeName}.attributes.type: ${entityType}`;
};
