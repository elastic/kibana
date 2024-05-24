/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const INTEGRATION_ASSISTANT_BASE_PATH = '/api/integration_assistant';

export const ECS_GRAPH_PATH = `${INTEGRATION_ASSISTANT_BASE_PATH}/ecs`;

export const CATEGORZATION_GRAPH_PATH = `${INTEGRATION_ASSISTANT_BASE_PATH}/categorization`;

export const RELATED_GRAPH_PATH = `${INTEGRATION_ASSISTANT_BASE_PATH}/related`;

export const INTEGRATION_BUILDER_PATH = `${INTEGRATION_ASSISTANT_BASE_PATH}/build`;

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
