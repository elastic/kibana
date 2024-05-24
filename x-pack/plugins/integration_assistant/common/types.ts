/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Pipeline {
  processors: any[];
}

// Server Request Schemas
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

// Server Response Schemas
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
