/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ESProcessorOptions {
  on_failure?: ESProcessorItem[];
  ignore_failure?: boolean;
  ignore_missing?: boolean;
  if?: string;
  tag?: string;
  [key: string]: unknown;
}

export interface ESProcessorItem {
  [processorName: string]: ESProcessorOptions;
}

export interface Pipeline {
  name?: string;
  description?: string;
  version?: number;
  processors: ESProcessorItem[];
  on_failure?: ESProcessorItem[];
}

export type InputType =
  | 'aws_cloudwatch'
  | 'aws_s3'
  | 'azure_blob_storage'
  | 'azure_eventhub'
  | 'cloudfoundry'
  | 'filestream'
  | 'gcp_pubsub'
  | 'gcs'
  | 'http_endpoint'
  | 'journald'
  | 'kafka'
  | 'tcp'
  | 'udp';

export interface DataStream {
  name: string;
  title: string;
  description: string;
  inputTypes: InputType[];
  rawSamples: string[];
  pipeline: Pipeline;
  docs: object[];
}

export interface Integration {
  name: string;
  title: string;
  description: string;
  dataStreams: DataStream[];
  logo?: string;
}

// Server Request Schemas
export interface BuildIntegrationApiRequest {
  integration: Integration;
}

export interface EcsMappingApiRequest {
  packageName: string;
  dataStreamName: string;
  rawSamples: string[];
  mapping?: object;
  connectorId: string;
}

export interface CategorizationApiRequest {
  packageName: string;
  dataStreamName: string;
  rawSamples: string[];
  currentPipeline: Pipeline;
  connectorId: string;
}

export interface RelatedApiRequest {
  packageName: string;
  dataStreamName: string;
  rawSamples: string[];
  currentPipeline: Pipeline;
  connectorId: string;
}

export interface CheckPipelineApiRequest {
  rawSamples: string[];
  pipeline: Pipeline;
}

// Server Response Schemas
export interface CategorizationApiResponse {
  results: {
    pipeline: Pipeline;
    docs: object[];
  };
}

export interface RelatedApiResponse {
  results: {
    pipeline: Pipeline;
    docs: object[];
  };
}

export interface EcsMappingApiResponse {
  results: {
    mapping: object;
    pipeline: Pipeline;
  };
}

export interface CheckPipelineApiResponse {
  pipelineResults: object[];
  errors?: object[];
}

export interface InstallPackageResponse {
  response: [{ id: string }];
}
