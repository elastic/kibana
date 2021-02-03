/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const importFileQuerySchema = schema.object({
  id: schema.maybe(schema.string()),
});

export const importFileBodySchema = schema.object({
  index: schema.string(),
  data: schema.arrayOf(schema.any()),
  settings: schema.maybe(schema.any()),
  /** Mappings */
  mappings: schema.any(),
  /** Ingest pipeline definition */
  ingestPipeline: schema.object({
    id: schema.maybe(schema.string()),
    pipeline: schema.maybe(schema.any()),
  }),
});
