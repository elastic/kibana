/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { useMemo } from 'react';
import { HttpFetchQuery } from '@kbn/core/public';
import { MlSavedObjectType } from '../../../../common/types/saved_objects';
import { HttpService } from '../http_service';
import { basePath } from '.';
import { useMlKibana } from '../../contexts/kibana';
import type {
  TrainedModelConfigResponse,
  ModelPipelines,
  TrainedModelStat,
  NodesOverviewResponse,
  MemoryUsageInfo,
} from '../../../../common/types/trained_models';

export interface InferenceQueryParams {
  decompress_definition?: boolean;
  from?: number;
  include_model_definition?: boolean;
  size?: number;
  tags?: string;
  // Custom kibana endpoint query params
  with_pipelines?: boolean;
  include?: 'total_feature_importance' | 'feature_importance_baseline' | string;
}

export interface InferenceStatsQueryParams {
  from?: number;
  size?: number;
}

export interface IngestStats {
  count: number;
  time_in_millis: number;
  current: number;
  failed: number;
}

export interface InferenceStatsResponse {
  count: number;
  trained_model_stats: TrainedModelStat[];
}

/**
 * Service with APIs calls to perform inference operations.
 * @param httpService
 */
export function trainedModelsApiProvider(httpService: HttpService) {
  const apiBasePath = basePath();

  return {
    /**
     * Fetches configuration information for a trained inference model.
     *
     * @param modelId - Model ID, collection of Model IDs or Model ID pattern.
     *                  Fetches all In case nothing is provided.
     * @param params - Optional query params
     */
    getTrainedModels(modelId?: string | string[], params?: InferenceQueryParams) {
      const model = Array.isArray(modelId) ? modelId.join(',') : modelId;

      return httpService.http<TrainedModelConfigResponse[]>({
        path: `${apiBasePath}/trained_models${model ? `/${model}` : ''}`,
        method: 'GET',
        ...(params ? { query: params as HttpFetchQuery } : {}),
      });
    },

    /**
     * Fetches usage information for trained inference models.
     *
     * @param modelId - Model ID, collection of Model IDs or Model ID pattern.
     *                  Fetches all In case nothing is provided.
     * @param params - Optional query params
     */
    getTrainedModelStats(modelId?: string | string[], params?: InferenceStatsQueryParams) {
      const model = Array.isArray(modelId) ? modelId.join(',') : modelId;

      return httpService.http<InferenceStatsResponse>({
        path: `${apiBasePath}/trained_models${model ? `/${model}` : ''}/_stats`,
        method: 'GET',
      });
    },

    /**
     * Fetches pipelines associated with provided models
     *
     * @param modelId - Model ID, collection of Model IDs.
     */
    getTrainedModelPipelines(modelId: string | string[]) {
      let model = modelId;
      if (Array.isArray(modelId)) {
        model = modelId.join(',');
      }

      return httpService.http<ModelPipelines[]>({
        path: `${apiBasePath}/trained_models/${model}/pipelines`,
        method: 'GET',
      });
    },

    /**
     * Deletes an existing trained inference model.
     *
     * @param modelId - Model ID
     */
    deleteTrainedModel(modelId: string) {
      return httpService.http<{ acknowledge: boolean }>({
        path: `${apiBasePath}/trained_models/${modelId}`,
        method: 'DELETE',
      });
    },

    getTrainedModelsNodesOverview() {
      return httpService.http<NodesOverviewResponse>({
        path: `${apiBasePath}/model_management/nodes_overview`,
        method: 'GET',
      });
    },

    startModelAllocation(
      modelId: string,
      queryParams?: {
        number_of_allocations: number;
        threads_per_allocation: number;
        priority: 'low' | 'normal';
      }
    ) {
      return httpService.http<{ acknowledge: boolean }>({
        path: `${apiBasePath}/trained_models/${modelId}/deployment/_start`,
        method: 'POST',
        query: queryParams,
      });
    },

    stopModelAllocation(modelId: string, options: { force: boolean } = { force: false }) {
      const force = options?.force;

      return httpService.http<{ acknowledge: boolean }>({
        path: `${apiBasePath}/trained_models/${modelId}/deployment/_stop`,
        method: 'POST',
        query: { force },
      });
    },

    updateModelDeployment(modelId: string, params: { number_of_allocations: number }) {
      return httpService.http<{ acknowledge: boolean }>({
        path: `${apiBasePath}/trained_models/${modelId}/deployment/_update`,
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    inferTrainedModel(
      modelId: string,
      payload: estypes.MlInferTrainedModelRequest['body'],
      timeout?: string
    ) {
      const body = JSON.stringify(payload);
      return httpService.http<estypes.MlInferTrainedModelResponse>({
        path: `${apiBasePath}/trained_models/infer/${modelId}`,
        method: 'POST',
        body,
        ...(timeout ? { query: { timeout } as HttpFetchQuery } : {}),
      });
    },

    trainedModelPipelineSimulate(
      pipeline: estypes.IngestPipeline,
      docs: estypes.IngestSimulateDocument[]
    ) {
      const body = JSON.stringify({
        pipeline,
        docs,
      });
      return httpService.http<estypes.IngestSimulateResponse>({
        path: `${apiBasePath}/trained_models/pipeline_simulate`,
        method: 'POST',
        body,
      });
    },

    memoryUsage(type?: MlSavedObjectType, node?: string, showClosedJobs = false) {
      return httpService.http<MemoryUsageInfo[]>({
        path: `${apiBasePath}/model_management/memory_usage`,
        method: 'GET',
        query: { type, node, showClosedJobs },
      });
    },
  };
}

export type TrainedModelsApiService = ReturnType<typeof trainedModelsApiProvider>;

/**
 * Hooks for accessing {@link TrainedModelsApiService} in React components.
 */
export function useTrainedModelsApiService(): TrainedModelsApiService {
  const {
    services: {
      mlServices: { httpService },
    },
  } = useMlKibana();
  return useMemo(() => trainedModelsApiProvider(httpService), [httpService]);
}
