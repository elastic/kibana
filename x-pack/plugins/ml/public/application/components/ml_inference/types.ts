/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestInferenceProcessor } from '@elastic/elasticsearch/lib/api/types';

export enum AddInferencePipelineSteps {
  Configuration,
  Advanced,
  Test,
  Create,
}

export interface MlInferenceState {
  condition?: string;
  creatingPipeline: boolean;
  error: boolean;
  fieldMap?: IngestInferenceProcessor['field_map'];
  fieldMapError?: string;
  ignoreFailure: boolean;
  inferenceConfig: IngestInferenceProcessor['inference_config'];
  inferenceConfigError?: string;
  modelId: string;
  pipelineName: string;
  pipelineNameError?: string;
  pipelineDescription: string;
  pipelineCreated: boolean;
  pipelineError?: string;
  tag?: string;
  targetField: string;
  targetFieldError?: string;
}

export interface AddInferencePipelineFormErrors {
  targetField?: string;
  fieldMap?: string;
  inferenceConfig?: string;
  pipelineName?: string;
}

export type InferenceModelTypes = 'regression' | 'classification';

export interface AdditionalSettings {
  condition?: string;
  tag?: string;
}
