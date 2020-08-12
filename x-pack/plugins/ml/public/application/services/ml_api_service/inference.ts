/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpService } from '../http_service';
import { basePath } from './index';

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
    metadata:
      | {
          analysis_config: any;
          input: any;
        }
      | Record<string, any>;
    model_id: string;
    tags: string;
    version: string;
  }>;
}

export interface InferenceStatsResponse {
  count: number;
  trained_model_stats: Array<{
    model_id: string;
    pipeline_count: number;
    ingest?: {
      total: {
        count: number;
        time_in_millis: number;
        current: number;
        failed: number;
      };
      pipelines?: Record<
        string,
        {
          count: number;
          time_in_millis: number;
          current: number;
          failed: number;
          processors: Array<
            Record<
              string,
              {
                type: string;
                stats: {
                  count: number;
                  time_in_millis: number;
                  current: number;
                  failed: number;
                };
              }
            >
          >;
        }
      >;
    };
  }>;
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
      let model = modelId ?? '_all';
      if (Array.isArray(modelId)) {
        model = modelId.join(',');
      }

      return httpService.http<InferenceConfigResponse>({
        path: `${apiBasePath}/inference/${model}`,
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
  };
}
