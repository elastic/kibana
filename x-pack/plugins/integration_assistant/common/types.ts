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
  [key: string]: any;
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

export enum InputTypes {
  Cloudwatch = 'aws-cloudwatch',
  S3 = 'aws-s3',
  AzureBlobStorage = 'azure-blob-storage',
  EventHub = 'azure-eventhub',
  Cloudfoundry = 'cloudfoundry',
  FileStream = 'filestream',
  PubSub = 'gcp-pubsub',
  GoogleCloudStorage = 'gcs',
  HTTPListener = 'http_endpoint',
  Journald = 'journald',
  Kafka = 'kafka',
  TCP = 'tcp',
  UDP = 'udp',
}

export interface DataStream {
  name: string;
  title: string;
  description: string;
  inputTypes: InputTypes[];
  rawSamples: string[];
  // TODO: figure out why changing this to `Pipeline` makes the frontend test objects complain about types.
  pipeline: object;
  docs: object[];
}

export interface Integration {
  name: string;
  title: string;
  description: string;
  version: string;
  dataStreams: DataStream[];
  streamVersion?: string;
  dockerComposeVersion?: string;
  initialVersion?: string;
  formatVersion?: string;
  owner: string;
  minKibanaVersion: string;
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
}

export interface CategorizationApiRequest {
  packageName: string;
  dataStreamName: string;
  rawSamples: string[];
  currentPipeline: object;
}

export interface RelatedApiRequest {
  packageName: string;
  dataStreamName: string;
  rawSamples: string[];
  currentPipeline: object;
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
