/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataFrameAnalyticsConfig } from './data_frame_analytics';

export interface IngestStats {
  count: number;
  time_in_millis: number;
  current: number;
  failed: number;
}

export interface TrainedModelStat {
  model_id: string;
  pipeline_count: number;
  inference_stats?: {
    failure_count: number;
    inference_count: number;
    cache_miss_count: number;
    missing_all_fields_count: number;
    timestamp: number;
  };
  ingest?: {
    total: IngestStats;
    pipelines: Record<
      string,
      IngestStats & {
        processors: Array<
          Record<
            string,
            {
              // TODO use type from ingest_pipelines plugin
              type: string;
              stats: IngestStats;
            }
          >
        >;
      }
    >;
  };
}

export interface ModelConfigResponse {
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
  inference_config?: Record<string, any>;
  pipelines?: Record<string, PipelineDefinition> | null;
}

export interface PipelineDefinition {
  processors?: Array<Record<string, any>>;
  description?: string;
}

export interface ModelPipelines {
  model_id: string;
  pipelines: Record<string, PipelineDefinition>;
}

/**
 * Get inference response from the ES endpoint
 */
export interface InferenceConfigResponse {
  trained_model_configs: ModelConfigResponse[];
}
