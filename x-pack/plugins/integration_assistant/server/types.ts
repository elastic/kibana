/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IntegrationAssistantPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IntegrationAssistantPluginStart {}

export interface BuildIntegrationAPIRequest {
  packageName: string;
  packageTitle: string;
  packageVersion: string;
  dataStreamName: string;
  inputTypes: string[];
  formSamples: string[];
  ingestPipeline: object;
  docs: object[];
}

export interface EcsMappingAPIRequest {
  packageName: string;
  dataStreamName: string;
  formSamples: string[];
}

export interface EcsMappingNewPipelineAPIRequest {
  packageName: string;
  dataStreamName: string;
  formSamples: string[];
  mapping: object;
}

export interface CategorizationAPIRequest {
  packageName: string;
  dataStreamName: string;
  formSamples: string[];
  ingestPipeline: object;
}

export interface RelatedAPIRequest {
  packageName: string;
  dataStreamName: string;
  formSamples: string[];
  ingestPipeline: object;
}

export interface CategorizationApiResponse {
  results: {
    pipeline: object;
    docs: object[];
  };
}

export interface RelatedApiResponse {
  results: {
    pipeline: object;
    docs: object[];
  };
}

export interface EcsMappingApiResponse {
  results: {
    mapping: object;
    current_pipeline: object;
  };
}

export interface CategorizationState {
  rawSamples: string[];
  samples: string[];
  formattedSamples: string;
  ecsTypes: string;
  ecsCategories: string;
  exAnswer: string;
  lastExecutedChain: string;
  packageName: string;
  dataStreamName: string;
  errors: object;
  pipelineResults: object[];
  finalized: boolean;
  reviewed: boolean;
  currentMapping: object;
  currentPipeline: object;
  currentProcessors: object[];
  invalidCategorization: object;
  initialPipeline: object;
  results: object;
}

export interface EcsMappingState {
  ecs: string;
  lastExecutedChain: string;
  rawSamples: string[];
  samples: string[];
  formattedSamples: string;
  exAnswer: string;
  packageName: string;
  dataStreamName: string;
  finalized: boolean;
  currentMapping: object;
  currentPipeline: object;
  duplicateFields: string[];
  missingKeys: string[];
  invalidEcsFields: string[];
  results: object;
  logFormat: string;
  ecsVersion: string;
}

export interface RelatedState {
  rawSamples: string[];
  samples: string[];
  formattedSamples: string;
  ecs: string;
  exAnswer: string;
  packageName: string;
  dataStreamName: string;
  errors: object;
  pipelineResults: object[];
  finalized: boolean;
  reviewed: boolean;
  currentMapping: object;
  currentPipeline: object;
  currentProcessors: object[];
  initialPipeline: object;
  results: object;
  lastExecutedChain: string;
}
