/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldMapping } from '../../../../../../../common/ml_inference_pipeline';

import { InferencePipelineInferenceConfig } from '../../../../../../../common/types/pipelines';

export interface InferencePipelineConfiguration {
  existingPipeline?: boolean;
  inferenceConfig?: InferencePipelineInferenceConfig;
  isPipelineNameUserSupplied?: boolean;
  modelID: string;
  pipelineName: string;
  fieldMappings?: FieldMapping[];
  targetField: string;
}

export interface AddInferencePipelineFormErrors {
  modelID?: string;
  fieldMappings?: string;
  pipelineName?: string;
}

export enum AddInferencePipelineSteps {
  Configuration,
  Fields,
  Test,
  Review,
}
