/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
});
