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
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { AppClient } from '../../../../types';
import { getRiskScoreLatestIndex } from '../../../../../common/entity_analytics/risk_engine';
import { getAssetCriticalityIndex } from '../../../../../common/entity_analytics/asset_criticality';
import type { EntityType } from '../../../../../common/api/entity_analytics/entity_store/common.gen';
import { buildHostEntityDefinition, buildUserEntityDefinition } from '../definition';
import { entityEngineDescriptorTypeName } from '../saved_object';

export const getEntityDefinition = async (
  entityType: EntityType,
  space: string,
  dataViewsService: DataViewsService,
  appClient: AppClient
) => {
  const indexPatterns = await buildIndexPatterns(space, appClient, dataViewsService);
  if (entityType === 'host') return buildHostEntityDefinition(space, indexPatterns);
  if (entityType === 'user') return buildUserEntityDefinition(space, indexPatterns);

  throw new Error(`Unsupported entity type: ${entityType}`);
};

export const buildIndexPatterns = async (
  space: string,
  appClient: AppClient,
  dataViewsService: DataViewsService
) => {
  const { alertsIndex, securitySolutionDataViewIndices } = await getSecuritySolutionIndices(
    appClient,
    dataViewsService
  );
  return [
    ...securitySolutionDataViewIndices.filter((item) => item !== alertsIndex),
    getAssetCriticalityIndex(space),
    getRiskScoreLatestIndex(space),
  ];
};

const getSecuritySolutionIndices = async (
  appClient: AppClient,
  dataViewsService: DataViewsService
) => {
  const securitySolutionDataViewId = appClient.getSourcererDataViewId();
  const dataView = await dataViewsService.get(securitySolutionDataViewId);
  const dataViewIndexPattern = dataView.getIndexPattern();
  return {
    securitySolutionDataViewIndices: dataViewIndexPattern.split(','),
    alertsIndex: appClient.getAlertsIndex(),
  };
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

export const isPromiseFulfilled = <T>(
  result: PromiseSettledResult<T>
): result is PromiseFulfilledResult<T> => result.status === 'fulfilled';

export const isPromiseRejected = (result: PromiseSettledResult): result is PromiseRejectedResult =>
  result.status === 'rejected';
