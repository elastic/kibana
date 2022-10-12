/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPipeline } from '@elastic/elasticsearch/lib/api/types';

export interface InferencePipeline {
  modelState: TrainedModelState;
  modelStateReason?: string;
  pipelineName: string;
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
  message: string;
  doc_count: number;
  timestamp: string | undefined; // Date string
}
