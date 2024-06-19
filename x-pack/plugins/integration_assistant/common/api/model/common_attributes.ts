/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import { ESProcessorItem } from './processor_attributes';

/**
 * Package name for the integration to be built.
 */
export type PackageName = z.infer<typeof PackageName>;
export const PackageName = z.string().min(1);

/**
 * Datastream name for the integration to be built.
 */
export type DatastreamName = z.infer<typeof DatastreamName>;
export const DatastreamName = z.string().min(1);

/**
 * String array containing the json raw samples that are used for ecs mapping.
 */
export type RawSamples = z.infer<typeof RawSamples>;
export const RawSamples = z.array(z.string());

/**
 * mapping object to ECS Mapping Request.
 */
export type Mapping = z.infer<typeof Mapping>;
export const Mapping = z.object({});

/**
 * LLM Connector to be used in each API request.
 */
export type Connector = z.infer<typeof Connector>;
export const Connector = z.string();

/**
 * An array of processed documents.
 */
export type Docs = z.infer<typeof Docs>;
export const Docs = z.array(z.object({}));

/**
 * The pipeline object.
 */
export type Pipeline = z.infer<typeof Pipeline>;
export const Pipeline = z.object({
  /**
   * The name of the pipeline.
   */
  name: z.string().optional(),
  /**
   * The description of the pipeline.
   */
  description: z.string().optional(),
  /**
   * The version of the pipeline.
   */
  version: z.number().int().optional(),
  /**
   * The processors to execute.
   */
  processors: z.array(ESProcessorItem),
  /**
   * The processors to execute if the pipeline fails.
   */
  on_failure: z.array(ESProcessorItem).optional(),
});

/**
 * The input type for the datastream to pull logs from.
 */
export type InputType = z.infer<typeof InputType>;
export const InputType = z.enum([
  'aws_cloudwatch',
  'aws_s3',
  'azure_blob_storage',
  'azure_eventhub',
  'cloudfoundry',
  'filestream',
  'gcp_pubsub',
  'gcs',
  'http_endpoint',
  'journald',
  'kafka',
  'tcp',
  'udp',
]);
export type InputTypeEnum = typeof InputType.enum;
export const InputTypeEnum = InputType.enum;

/**
 * The datastream object.
 */
export type Datastream = z.infer<typeof Datastream>;
export const Datastream = z.object({
  /**
   * The name of the datastream.
   */
  name: z.string(),
  /**
   * The title of the datastream.
   */
  title: z.string(),
  /**
   * The description of the datastream.
   */
  description: z.string(),
  /**
   * The input types of the datastream.
   */
  inputTypes: z.array(InputType),
  /**
   * The raw samples of the datastream.
   */
  rawSamples: RawSamples,
  /**
   * The pipeline of the datastream.
   */
  pipeline: Pipeline,
  /**
   * The documents of the datastream.
   */
  docs: Docs,
});

/**
 * The integration object.
 */
export type Integration = z.infer<typeof Integration>;
export const Integration = z.object({
  /**
   * The name of the integration.
   */
  name: z.string(),
  /**
   * The title of the integration.
   */
  title: z.string(),
  /**
   * The description of the integration.
   */
  description: z.string(),
  /**
   * The datastreams of the integration.
   */
  dataStreams: z.array(Datastream),
  /**
   * The logo of the integration.
   */
  logo: z.string().optional(),
});

/**
 * An array of pipeline results.
 */
export type PipelineResults = z.infer<typeof PipelineResults>;
export const PipelineResults = z.array(z.object({}));

/**
 * An array of errors.
 */
export type Errors = z.infer<typeof Errors>;
export const Errors = z.array(z.object({}));
