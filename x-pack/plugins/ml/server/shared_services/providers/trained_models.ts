/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type {
  GetModelDownloadConfigOptions,
  ModelDefinitionResponse,
} from '@kbn/ml-trained-models-utils';
import type { MlFeatures } from '../../../common/constants/app';
import type {
  MlInferTrainedModelRequest,
  MlStopTrainedModelDeploymentRequest,
  UpdateTrainedModelDeploymentRequest,
  UpdateTrainedModelDeploymentResponse,
} from '../../lib/ml_client/types';
import { modelsProvider } from '../../models/model_management';
import type { GetCuratedModelConfigParams } from '../../models/model_management/models_provider';
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
    startTrainedModelDeployment(
      params: estypes.MlStartTrainedModelDeploymentRequest
    ): Promise<estypes.MlStartTrainedModelDeploymentResponse>;
    stopTrainedModelDeployment(
      params: MlStopTrainedModelDeploymentRequest
    ): Promise<estypes.MlStopTrainedModelDeploymentResponse>;
    inferTrainedModel(
      params: MlInferTrainedModelRequest
    ): Promise<estypes.MlInferTrainedModelResponse>;
    deleteTrainedModel(
      params: estypes.MlDeleteTrainedModelRequest
    ): Promise<estypes.MlDeleteTrainedModelResponse>;
    updateTrainedModelDeployment(
      params: UpdateTrainedModelDeploymentRequest
    ): Promise<UpdateTrainedModelDeploymentResponse>;
    putTrainedModel(
      params: estypes.MlPutTrainedModelRequest
    ): Promise<estypes.MlPutTrainedModelResponse>;
    getELSER(params?: GetModelDownloadConfigOptions): Promise<ModelDefinitionResponse>;
    getCuratedModelConfig(...params: GetCuratedModelConfigParams): Promise<ModelDefinitionResponse>;
    installElasticModel(modelId: string): Promise<estypes.MlTrainedModelConfig>;
  };
}

export function getTrainedModelsProvider(
  getGuards: GetGuards,
  cloud: CloudSetup,
  enabledFeatures: MlFeatures
): TrainedModelsProvider {
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
        async startTrainedModelDeployment(params: estypes.MlStartTrainedModelDeploymentRequest) {
          return await guards
            .isFullLicense()
            .hasMlCapabilities(['canStartStopTrainedModels'])
            .ok(async ({ mlClient }) => {
              return mlClient.startTrainedModelDeployment(params);
            });
        },
        async stopTrainedModelDeployment(params: MlStopTrainedModelDeploymentRequest) {
          return await guards
            .isFullLicense()
            .hasMlCapabilities(['canStartStopTrainedModels'])
            .ok(async ({ mlClient }) => {
              return mlClient.stopTrainedModelDeployment(params);
            });
        },
        async inferTrainedModel(params: MlInferTrainedModelRequest) {
          return await guards
            .isFullLicense()
            .hasMlCapabilities(['canGetTrainedModels'])
            .ok(async ({ mlClient }) => {
              return mlClient.inferTrainedModel(params);
            });
        },
        async deleteTrainedModel(params: estypes.MlDeleteTrainedModelRequest) {
          return await guards
            .isFullLicense()
            .hasMlCapabilities(['canDeleteTrainedModels'])
            .ok(async ({ mlClient }) => {
              return mlClient.deleteTrainedModel(params);
            });
        },
        async updateTrainedModelDeployment(params: UpdateTrainedModelDeploymentRequest) {
          return await guards
            .isFullLicense()
            .hasMlCapabilities(['canCreateTrainedModels'])
            .ok(async ({ mlClient }) => {
              return mlClient.updateTrainedModelDeployment(params);
            });
        },
        async putTrainedModel(params: estypes.MlPutTrainedModelRequest) {
          return await guards
            .isFullLicense()
            .hasMlCapabilities(['canCreateTrainedModels'])
            .ok(async ({ mlClient }) => {
              return mlClient.putTrainedModel(params);
            });
        },
        async getELSER(params?: GetModelDownloadConfigOptions) {
          return await guards
            .isFullLicense()
            .hasMlCapabilities(['canGetTrainedModels'])
            .ok(async ({ scopedClient, mlClient }) => {
              return modelsProvider(scopedClient, mlClient, cloud, enabledFeatures).getELSER(
                params
              );
            });
        },
        async getCuratedModelConfig(...params: GetCuratedModelConfigParams) {
          return await guards
            .isFullLicense()
            .hasMlCapabilities(['canGetTrainedModels'])
            .ok(async ({ scopedClient, mlClient }) => {
              return modelsProvider(
                scopedClient,
                mlClient,
                cloud,
                enabledFeatures
              ).getCuratedModelConfig(...params);
            });
        },
        async installElasticModel(modelId: string) {
          return await guards
            .isFullLicense()
            .hasMlCapabilities(['canGetTrainedModels'])
            .ok(async ({ scopedClient, mlClient, mlSavedObjectService }) => {
              return modelsProvider(
                scopedClient,
                mlClient,
                cloud,
                enabledFeatures
              ).installElasticModel(modelId, mlSavedObjectService);
            });
        },
      };
    },
  };
}
