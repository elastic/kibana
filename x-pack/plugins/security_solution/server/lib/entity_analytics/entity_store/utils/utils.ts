/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_LATEST,
  ENTITY_SCHEMA_VERSION_V1,
  entitiesIndexPattern,
} from '@kbn/entities-schema';
import type { EntityType } from '../../../../../common/api/entity_analytics/entity_store/common.gen';
import { buildHostEntityDefinition, buildUserEntityDefinition } from '../definition';
import { entityEngineDescriptorTypeName } from '../saved_object';
import { getAssetCriticalityIndex } from '../../../../../common/entity_analytics/asset_criticality';

export const getEntityDefinition = (entityType: EntityType, spaceId: string = 'default') => {
  const entityDefinition =
    entityType === 'host' ? buildHostEntityDefinition(spaceId) : buildUserEntityDefinition(spaceId);

  const assetCriticalityIndex = getAssetCriticalityIndex(spaceId);

  entityDefinition.indexPatterns.push(assetCriticalityIndex);

  return entityDefinition;
};

export const getIdentityFieldForEntityType = (entityType: EntityType) => {
  if (entityType === 'host') return 'host.name';

  return 'user.name';
};

export const getByEntityTypeQuery = (entityType: EntityType) => {
  return `${entityEngineDescriptorTypeName}.attributes.type: ${entityType}`;
};

export const getEntitiesIndexName = (entityType: EntityType, namespace: string) =>
  entitiesIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V1,
    dataset: ENTITY_LATEST,
    definitionId: buildEntityDefinitionId(entityType, namespace),
  });

export const buildEntityDefinitionId = (entityType: EntityType, space: string) => {
  return `ea_${space}_${entityType}_entity_store`;
};
