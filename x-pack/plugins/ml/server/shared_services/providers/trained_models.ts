/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { GetGuards } from '../shared_services';

export interface TrainedModelsProvider {
  trainedModelsProvider(
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ): {
    getTrainedModels(
      params: estypes.MlGetTrainedModelsRequest
    ): Promise<estypes.MlGetTrainedModelsResponse>;
    getTrainedModelsStats(
      params: estypes.MlGetTrainedModelsStatsRequest
    ): Promise<estypes.MlGetTrainedModelsStatsResponse>;
  };
}

export function getTrainedModelsProvider(getGuards: GetGuards): TrainedModelsProvider {
  return {
    trainedModelsProvider(request: KibanaRequest, savedObjectsClient: SavedObjectsClientContract) {
      const guards = getGuards(request, savedObjectsClient);
      return {
        async getTrainedModels(params: estypes.MlGetTrainedModelsRequest) {
          return await guards
            .isFullLicense()
            .hasMlCapabilities(['canGetTrainedModels'])
            .ok(async ({ mlClient }) => {
              return mlClient.getTrainedModels(params);
            });
        },
        async getTrainedModelsStats(params: estypes.MlGetTrainedModelsStatsRequest) {
          return await guards
            .isFullLicense()
            .hasMlCapabilities(['canGetTrainedModels'])
            .ok(async ({ mlClient }) => {
              return mlClient.getTrainedModelsStats(params);
            });
        },
      };
    },
  };
}
