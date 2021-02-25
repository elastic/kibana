/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
