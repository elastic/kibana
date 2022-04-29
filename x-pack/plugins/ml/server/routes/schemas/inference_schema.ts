/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const modelIdSchema = schema.object({
  /**
   * Model ID
   */
  modelId: schema.string(),
});

export const optionalModelIdSchema = schema.object({
  /**
   * Model ID
   */
  modelId: schema.maybe(schema.string()),
});

export const getInferenceQuerySchema = schema.object({
  size: schema.maybe(schema.string()),
  with_pipelines: schema.maybe(schema.string()),
  include: schema.maybe(schema.string()),
});

export const putTrainedModelQuerySchema = schema.object({
  defer_definition_decompression: schema.maybe(schema.boolean()),
});

export const pipelineSchema = schema.object({
  pipeline: schema.object({
    description: schema.maybe(schema.string()),
    processors: schema.arrayOf(schema.recordOf(schema.string(), schema.any())),
    version: schema.maybe(schema.number()),
    on_failure: schema.maybe(schema.arrayOf(schema.recordOf(schema.string(), schema.any()))),
  }),
  docs: schema.arrayOf(schema.recordOf(schema.string(), schema.any())),
  verbose: schema.maybe(schema.boolean()),
});

export const inferTrainedModelQuery = schema.object({ timeout: schema.maybe(schema.string()) });
export const inferTrainedModelBody = schema.object({
  docs: schema.any(),
  inference_config: schema.maybe(schema.any()),
});
