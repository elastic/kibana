/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const analyzeFileQuerySchema = schema.maybe(
  schema.object({
    charset: schema.maybe(schema.string()),
    column_names: schema.maybe(schema.string()),
    delimiter: schema.maybe(schema.string()),
    explain: schema.maybe(schema.string()),
    format: schema.maybe(schema.string()),
    grok_pattern: schema.maybe(schema.string()),
    has_header_row: schema.maybe(schema.string()),
    line_merge_size_limit: schema.maybe(schema.string()),
    lines_to_sample: schema.maybe(schema.string()),
    quote: schema.maybe(schema.string()),
    should_trim_fields: schema.maybe(schema.string()),
    timeout: schema.maybe(schema.string()),
    timestamp_field: schema.maybe(schema.string()),
    timestamp_format: schema.maybe(schema.string()),
  })
);

export const importFileQuerySchema = schema.object({
  id: schema.maybe(schema.string()),
});

export const importFileBodySchema = schema.object({
  index: schema.maybe(schema.string()),
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
