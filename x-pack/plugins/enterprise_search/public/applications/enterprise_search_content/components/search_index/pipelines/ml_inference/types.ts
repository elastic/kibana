/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferencePipelineInferenceConfig } from '../../../../../../../common/types/pipelines';

export interface InferencePipelineConfiguration {
  destinationField: string;
  existingPipeline?: boolean;
  inferenceConfig?: InferencePipelineInferenceConfig;
  modelID: string;
  pipelineName: string;
  sourceField: string;
}

export interface AddInferencePipelineFormErrors {
  destinationField?: string;
  modelID?: string;
  pipelineName?: string;
  sourceField?: string;
}

export enum AddInferencePipelineSteps {
  Configuration,
  Test,
  Review,
}
