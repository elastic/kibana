/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

/**
 * Kibana configuration schema
 */
export const transformConfigSchema = schema.object({
  auto_start: schema.boolean(),
  auto_create: schema.boolean(),
  enabled: schema.boolean(),
  query: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  retention_policy: schema.maybe(
    schema.object({
      time: schema.object({
        field: schema.string(),
        max_age: schema.string(),
      }),
    })
  ),
  docs_per_second: schema.maybe(schema.number({ min: 1 })),
  max_page_search_size: schema.maybe(schema.number({ min: 1, max: 10000 })),
  settings: schema.arrayOf(
    schema.object({
      prefix: schema.string(),
      indices: schema.arrayOf(schema.string()),
      data_sources: schema.arrayOf(schema.arrayOf(schema.string())),
      disable_widgets: schema.maybe(schema.arrayOf(schema.string())),
      disable_transforms: schema.maybe(schema.arrayOf(schema.string())),
    })
  ),
});

export type TransformConfigSchema = TypeOf<typeof transformConfigSchema>;
