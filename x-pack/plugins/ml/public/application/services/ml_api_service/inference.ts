/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { HttpService } from '../http_service';
import { basePath } from './index';
import { useMlKibana } from '../../contexts/kibana';
import { DataFrameAnalyticsConfig } from '../../data_frame_analytics/common/analytics';

export interface InferenceQueryParams {
  decompress_definition?: boolean;
  from?: number;
  include_model_definition?: boolean;
  size?: number;
  tags?: string;
}

export interface InferenceStatsQueryParams {
  from?: number;
  size?: number;
}

export interface InferenceConfigResponse {
  trained_model_configs: Array<{
    created_by: string;
    create_time: string;
    default_field_map: Record<string, string>;
    estimated_heap_memory_usage_bytes: number;
    estimated_operations: number;
    license_level: string;
    metadata?:
      | {
          analytics_config: DataFrameAnalyticsConfig;
          input: any;
        }
      | Record<string, any>;
    model_id: string;
    tags: string;
    version: string;
    inference_config: any;
  }>;
}

export type ModelConfigResponse = InferenceConfigResponse['trained_model_configs'][number];

export interface InferenceStatsResponse {
  count: number;
  trained_model_stats: Array<{
    model_id: string;
    pipeline_count: number;
    inference_stats: {
      failure_count: number;
      inference_count: number;
      cache_miss_count: number;
      missing_all_fields_count: number;
      timestamp: number;
    };
  }>;
}

export type ModelStats = InferenceStatsResponse['trained_model_stats'][number];

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

      return httpService.http<InferenceConfigResponse>({
        path: `${apiBasePath}/inference${model && `/${model}`}`,
        method: 'GET',
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
