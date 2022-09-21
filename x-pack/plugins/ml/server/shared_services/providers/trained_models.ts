/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { GetGuards } from '../shared_services';

export interface AnomalyDetectorsProvider {
  trainedModelsProvider(
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ): {
    getTrainedModels(modelId?: string): Promise<estypes.MlGetTrainedModelsResponse>;
    getTrainedModelStats(modelId?: string): Promise<estypes.MlGetTrainedModelsStatsResponse>;
  };
}

export function getTrainedModelsProvider(getGuards: GetGuards): AnomalyDetectorsProvider {
  return {
    trainedModelsProvider(request: KibanaRequest, savedObjectsClient: SavedObjectsClientContract) {
      return {
        async getTrainedModels(modelId?: string) {
          return await getGuards(request, savedObjectsClient)
            .isFullLicense()
            .hasMlCapabilities(['canGetTrainedModels'])
            .ok(async ({ mlClient }) => {
              return mlClient.getTrainedModels(
                modelId !== undefined ? { model_id: modelId } : undefined
              );
            });
        },
        async getTrainedModelStats(modelId?: string) {
          return await getGuards(request, savedObjectsClient)
            .isFullLicense()
            .hasMlCapabilities(['canGetTrainedModels'])
            .ok(async ({ mlClient }) => {
              return mlClient.getTrainedModelsStats(
                modelId !== undefined ? { model_id: modelId } : undefined
              );
            });
        },
      };
    },
  };
}
