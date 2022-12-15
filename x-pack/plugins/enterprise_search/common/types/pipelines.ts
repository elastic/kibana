/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestInferenceConfig, IngestPipeline } from '@elastic/elasticsearch/lib/api/types';

export interface InferencePipeline {
  modelId: string | undefined;
  modelState: TrainedModelState;
  modelStateReason?: string;
  pipelineName: string;
  pipelineReferences: string[];
  types: string[];
}

export enum TrainedModelState {
  NotDeployed = '',
  Starting = 'starting',
  Stopping = 'stopping',
  Started = 'started',
  Failed = 'failed',
}

export interface MlInferencePipeline extends IngestPipeline {
  version?: number;
}

export interface MlInferenceHistoryItem {
  doc_count: number;
  pipeline: string;
}

export interface MlInferenceHistoryResponse {
  history: MlInferenceHistoryItem[];
}

export interface MlInferenceError {
  doc_count: number;
  message: string;
  timestamp: string | undefined; // Date string
}

export interface CreateMlInferencePipelineResponse {
  addedToParentPipeline?: boolean;
  created?: boolean;
  id: string;
}

export interface AttachMlInferencePipelineResponse {
  addedToParentPipeline?: boolean;
  created?: boolean;
  id: string;
}

/**
 * Response for deleting sub-pipeline from @ml-inference pipeline.
 * If sub-pipeline was deleted successfully, 'deleted' field contains its name.
 * If parent pipeline was updated successfully, 'updated' field contains its name.
 */
export interface DeleteMlInferencePipelineResponse {
  deleted?: string;
  updated?: string;
}

export interface CreateMlInferencePipelineParameters {
  destination_field?: string;
  inference_config?: InferencePipelineInferenceConfig;
  model_id: string;
  pipeline_name: string;
  source_field: string;
}

export type InferencePipelineInferenceConfig = IngestInferenceConfig & {
  zero_shot_classification?: {
    labels: string[];
  };
};
