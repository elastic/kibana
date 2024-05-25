/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ProcessorObject {
  on_failure?: ProcessorKey[];
  ignore_failure?: boolean;
  if?: string;
  tag?: string;
  [key: string]: any;
}

export interface ProcessorKey {
  [processorName: string]: ProcessorObject;
}

export interface Pipeline {
  name?: string;
  description?: string;
  version?: number;
  processors: ProcessorKey[];
  on_failure?: ProcessorKey[];
}

// Server Request Schemas
export interface BuildIntegrationApiRequest {
  packageName: string;
  packageTitle: string;
  packageVersion: string;
  dataStreamName: string;
  dataStreamTitle: string;
  inputTypes: string[];
  formSamples: string[];
  ingestPipeline: object;
  docs: object[];
}

export interface EcsMappingApiRequest {
  packageName: string;
  dataStreamName: string;
  formSamples: string[];
  mapping?: object;
}

export interface CategorizationApiRequest {
  packageName: string;
  dataStreamName: string;
  formSamples: string[];
  ingestPipeline: object;
}

export interface RelatedApiRequest {
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
    pipeline: object;
  };
}
