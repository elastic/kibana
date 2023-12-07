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

export const modelAndDeploymentIdSchema = schema.object({
  /**
   * Model ID
   */
  modelId: schema.string(),
  /**
   * Deployment ID
   */
  deploymentId: schema.string(),
});

export const threadingParamsSchema = schema.maybe(
  schema.object({
    number_of_allocations: schema.maybe(schema.number()),
    threads_per_allocation: schema.maybe(schema.number()),
    priority: schema.maybe(schema.oneOf([schema.literal('low'), schema.literal('normal')])),
    deployment_id: schema.maybe(schema.string()),
  })
);

export const updateDeploymentParamsSchema = schema.object({
  number_of_allocations: schema.number(),
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
  with_indices: schema.maybe(schema.oneOf([schema.string(), schema.boolean()])),
  include: schema.maybe(schema.string()),
});

export const putTrainedModelQuerySchema = schema.object({
  defer_definition_decompression: schema.maybe(schema.boolean()),
});

export const inferTrainedModelQuery = schema.object({ timeout: schema.maybe(schema.string()) });
export const inferTrainedModelBody = schema.object({
  docs: schema.any(),
  inference_config: schema.maybe(schema.any()),
});

export const pipelineSimulateBody = schema.object({
  pipeline: schema.any(),
  docs: schema.arrayOf(schema.any()),
});
export const pipelineDocs = schema.arrayOf(schema.string());

export const stopDeploymentSchema = schema.object({
  modelId: schema.string(),
  /** force stop */
  force: schema.maybe(schema.boolean()),
});

export const deleteTrainedModelQuerySchema = schema.object({
  with_pipelines: schema.maybe(schema.boolean({ defaultValue: false })),
  force: schema.maybe(schema.boolean({ defaultValue: false })),
});

export const createIngestPipelineSchema = schema.object({
  pipelineName: schema.string(),
  pipeline: schema.maybe(
    schema.object({
      processors: schema.arrayOf(schema.any()),
      description: schema.maybe(schema.string()),
    })
  ),
});

export const modelDownloadsQuery = schema.object({
  version: schema.maybe(schema.oneOf([schema.literal('1'), schema.literal('2')])),
});
