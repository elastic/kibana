/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AssetCriticalityService } from '../asset_criticality';
import type { RiskEngineDataClient } from '../risk_engine/risk_engine_data_client';
import type { RiskScoreDataClient } from '../risk_score/risk_score_data_client';
import type { EntityStoreDataClient } from './entity_store_data_client';

export interface UpdateEntityStoreParams {
  timestamps?: {
    lastEntityQuery?: string;
    lastCriticalityQuery?: string;
  };
}

export interface UpdateEntityStoreResponse {
  errors: string[];
  entitiesUpdated: number;
  entitiesCreated: number;
  timestamps: {
    lastEntityQuery?: string;
    lastCriticalityQuery?: string;
  };
}

export const updateEntityStore = async ({
  spaceId,
  timestamps,
  esClient,
  logger,
  assetCriticalityService,
  riskEngineDataClient,
  entityStoreDataClient,
  riskScoreDataClient,
}: UpdateEntityStoreParams & {
  spaceId: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  assetCriticalityService: AssetCriticalityService;
  entityStoreDataClient: EntityStoreDataClient;
  riskEngineDataClient: RiskEngineDataClient;
  riskScoreDataClient: RiskScoreDataClient;
}): Promise<UpdateEntityStoreResponse> => {
  return {
    errors: [],
    entitiesUpdated: 0,
    entitiesCreated: 0,
    timestamps: {},
  };
};
