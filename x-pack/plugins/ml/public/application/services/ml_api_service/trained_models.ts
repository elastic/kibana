/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { HttpFetchQuery } from 'kibana/public';
import { HttpService } from '../http_service';
import { basePath } from './index';
import { useMlKibana } from '../../contexts/kibana';
import {
  TrainedModelConfigResponse,
  ModelPipelines,
  TrainedModelStat,
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
      let model = modelId ?? '';
      if (Array.isArray(modelId)) {
        model = modelId.join(',');
      }

      return httpService.http<TrainedModelConfigResponse[]>({
        path: `${apiBasePath}/trained_models${model && `/${model}`}`,
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
      let model = modelId ?? '_all';
      if (Array.isArray(modelId)) {
        model = modelId.join(',');
      }

      return httpService.http<InferenceStatsResponse>({
        path: `${apiBasePath}/trained_models/${model}/_stats`,
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
      return httpService.http<any>({
        path: `${apiBasePath}/trained_models/${modelId}`,
        method: 'DELETE',
      });
    },
  };
}

type TrainedModelsApiService = ReturnType<typeof trainedModelsApiProvider>;

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
