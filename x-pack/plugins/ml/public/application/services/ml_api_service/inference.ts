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
  ModelConfigResponse,
  ModelPipelines,
  TrainedModelStat,
} from '../../../../common/types/inference';

export interface InferenceQueryParams {
  decompress_definition?: boolean;
  from?: number;
  include_model_definition?: boolean;
  size?: number;
  tags?: string;
  // Custom kibana endpoint query params
  with_pipelines?: boolean;
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
export function inferenceApiProvider(httpService: HttpService) {
  const apiBasePath = basePath();

  return {
    /**
     * Fetches configuration information for a trained inference model.
     *
     * @param modelId - Model ID, collection of Model IDs or Model ID pattern.
     *                  Fetches all In case nothing is provided.
     * @param params - Optional query params
     */
    getInferenceModel(modelId?: string | string[], params?: InferenceQueryParams) {
      let model = modelId ?? '';
      if (Array.isArray(modelId)) {
        model = modelId.join(',');
      }

      return httpService.http<ModelConfigResponse[]>({
        path: `${apiBasePath}/inference${model && `/${model}`}`,
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
    getInferenceModelStats(modelId?: string | string[], params?: InferenceStatsQueryParams) {
      let model = modelId ?? '_all';
      if (Array.isArray(modelId)) {
        model = modelId.join(',');
      }

      return httpService.http<InferenceStatsResponse>({
        path: `${apiBasePath}/inference/${model}/_stats`,
        method: 'GET',
      });
    },

    /**
     * Fetches pipelines associated with provided models
     *
     * @param modelId - Model ID, collection of Model IDs.
     */
    getInferenceModelPipelines(modelId: string | string[]) {
      let model = modelId;
      if (Array.isArray(modelId)) {
        model = modelId.join(',');
      }

      return httpService.http<ModelPipelines[]>({
        path: `${apiBasePath}/inference/${model}/pipelines`,
        method: 'GET',
      });
    },

    /**
     * Deletes an existing trained inference model.
     *
     * @param modelId - Model ID
     */
    deleteInferenceModel(modelId: string) {
      return httpService.http<any>({
        path: `${apiBasePath}/inference/${modelId}`,
        method: 'DELETE',
      });
    },
  };
}

type InferenceApiService = ReturnType<typeof inferenceApiProvider>;

/**
 * Hooks for accessing {@link InferenceApiService} in React components.
 */
export function useInferenceApiService(): InferenceApiService {
  const {
    services: {
      mlServices: { httpService },
    },
  } = useMlKibana();
  return useMemo(() => inferenceApiProvider(httpService), [httpService]);
}
