/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { updateEntityStore } from './update_entity_store';
import type { UpdateEntityStoreParams, UpdateEntityStoreResponse } from './update_entity_store';
import type { RiskEngineDataClient } from '../risk_engine/risk_engine_data_client';
import type { AssetCriticalityService } from '../asset_criticality/asset_criticality_service';
import type { RiskScoreDataClient } from '../risk_score/risk_score_data_client';
import type { EntityStoreDataClient } from './entity_store_data_client';

export interface EntityStoreService {
  updateEntityStore: (params: UpdateEntityStoreParams) => Promise<UpdateEntityStoreResponse>;
}

export interface EntityStoreServiceFactoryParams {
  assetCriticalityService: AssetCriticalityService;
  esClient: ElasticsearchClient;
  logger: Logger;
  riskEngineDataClient: RiskEngineDataClient;
  entityStoreDataClient: EntityStoreDataClient;
  riskScoreDataClient: RiskScoreDataClient;
  spaceId: string;
}

export const entityStoreServiceFactory = ({
  assetCriticalityService,
  esClient,
  logger,
  entityStoreDataClient,
  riskEngineDataClient,
  riskScoreDataClient,
  spaceId,
}: EntityStoreServiceFactoryParams): EntityStoreService => ({
  updateEntityStore: (params) =>
    updateEntityStore({
      ...params,
      riskEngineDataClient,
      entityStoreDataClient,
      riskScoreDataClient,
      spaceId,
      assetCriticalityService,
      esClient,
      logger,
    }),
});
