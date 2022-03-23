/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { DataFrameAnalyticsConfig } from './data_frame_analytics';
import type { FeatureImportanceBaseline, TotalFeatureImportance } from './feature_importance';
import type { XOR } from './common';
import type { DeploymentState, TrainedModelType } from '../constants/trained_models';

export interface IngestStats {
  count: number;
  time_in_millis: number;
  current: number;
  failed: number;
}

export interface TrainedModelModelSizeStats {
  model_size_bytes: number;
  required_native_memory_bytes: number;
}

export interface TrainedModelStat {
  model_id?: string;
  pipeline_count?: number;
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
  deployment_stats?: Omit<TrainedModelDeploymentStatsResponse, 'model_id'>;
  model_size_stats?: TrainedModelModelSizeStats;
}

type TreeNode = object;

export type PutTrainedModelConfig = {
  description?: string;
  metadata?: {
    analytics_config: DataFrameAnalyticsConfig;
    input: unknown;
    total_feature_importance?: TotalFeatureImportance[];
    feature_importance_baseline?: FeatureImportanceBaseline;
    model_aliases?: string[];
  } & Record<string, unknown>;
  tags?: string[];
  inference_config?: Record<string, unknown>;
  input: { field_names: string[] };
} & XOR<
  { compressed_definition: string },
  {
    definition: {
      preprocessors: object[];
      trained_model: {
        tree: {
          classification_labels?: string;
          feature_names: string;
          target_type: string;
          tree_structure: TreeNode[];
        };
        tree_node: TreeNode;
        ensemble?: object;
      };
    };
  }
>; // compressed_definition and definition are mutually exclusive

export type TrainedModelConfigResponse = estypes.MlTrainedModelConfig & {
  /**
   * Associated pipelines. Extends response from the ES endpoint.
   */
  pipelines?: Record<string, PipelineDefinition> | null;

  metadata?: {
    analytics_config: DataFrameAnalyticsConfig;
    input: unknown;
    total_feature_importance?: TotalFeatureImportance[];
    feature_importance_baseline?: FeatureImportanceBaseline;
    model_aliases?: string[];
  } & Record<string, unknown>;
  model_id: string;
  model_type: TrainedModelType;
  tags: string[];
  version: string;
  inference_config?: Record<string, any>;
};

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
  trained_model_configs: TrainedModelConfigResponse[];
}

export interface TrainedModelDeploymentStatsResponse {
  model_id: string;
  inference_threads: number;
  model_threads: number;
  state: DeploymentState;
  allocation_status: { target_allocation_count: number; state: string; allocation_count: number };
  nodes: Array<{
    node: Record<
      string,
      {
        transport_address: string;
        roles: string[];
        name: string;
        attributes: {
          'ml.machine_memory': string;
          'xpack.installed': string;
          'ml.max_open_jobs': string;
          'ml.max_jvm_size': string;
        };
        ephemeral_id: string;
      }
    >;
    inference_count: number;
    routing_state: { routing_state: string };
    average_inference_time_ms: number;
    last_access: number;
    number_of_pending_requests: number;
    start_time: number;
  }>;
}

export interface AllocatedModel {
  inference_threads: number;
  allocation_status: {
    target_allocation_count: number;
    state: string;
    allocation_count: number;
  };
  /**
   * Not required for rendering in the Model stats
   */
  model_id?: string;
  state: string;
  model_threads: number;
  model_size_bytes: number;
  required_native_memory_bytes: number;
  node: {
    /**
     * Not required for rendering in the Nodes overview
     */
    name?: string;
    average_inference_time_ms: number;
    inference_count: number;
    routing_state: {
      routing_state: string;
      reason?: string;
    };
    last_access?: number;
    number_of_pending_requests: number;
    start_time: number;
  };
}

export interface NodeDeploymentStatsResponse {
  id: string;
  name: string;
  attributes: Record<string, string>;
  roles: string[];
  allocated_models: AllocatedModel[];
  memory_overview: {
    machine_memory: {
      /** Total machine memory in bytes */
      total: number;
      jvm: number;
    };
    /** Max amount of memory available for ML */
    ml_max_in_bytes: number;
    /** Open anomaly detection jobs + hardcoded overhead */
    anomaly_detection: {
      /** Total size in bytes */
      total: number;
    };
    /** DFA jobs currently in training + hardcoded overhead */
    dfa_training: {
      total: number;
    };
    /** Allocated trained models */
    trained_models: {
      total: number;
      by_model: Array<{
        model_id: string;
        model_size: number;
      }>;
    };
  };
}

export interface NodesOverviewResponse {
  _nodes: { total: number; failed: number; successful: number };
  nodes: NodeDeploymentStatsResponse[];
}
