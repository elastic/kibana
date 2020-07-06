/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const startDatafeedSchema = schema.object({
  start: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
  end: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
  timeout: schema.maybe(schema.any()),
});

export const datafeedConfigSchema = schema.object({
  datafeed_id: schema.maybe(schema.string()),
  feed_id: schema.maybe(schema.string()),
  aggregations: schema.maybe(schema.any()),
  aggs: schema.maybe(schema.any()),
  chunking_config: schema.maybe(
    schema.object({
      mode: schema.maybe(schema.string()),
      time_span: schema.maybe(schema.string()),
    })
  ),
  frequency: schema.maybe(schema.string()),
  indices: schema.maybe(schema.arrayOf(schema.string())),
  indexes: schema.maybe(schema.arrayOf(schema.string())),
  job_id: schema.maybe(schema.string()),
  query: schema.maybe(schema.any()),
  max_empty_searches: schema.maybe(schema.number()),
  query_delay: schema.maybe(schema.string()),
  script_fields: schema.maybe(schema.any()),
  scroll_size: schema.maybe(schema.number()),
  delayed_data_check_config: schema.maybe(schema.any()),
  indices_options: schema.maybe(
    schema.object({
      expand_wildcards: schema.maybe(schema.arrayOf(schema.string())),
      ignore_unavailable: schema.maybe(schema.boolean()),
      allow_no_indices: schema.maybe(schema.boolean()),
      ignore_throttled: schema.maybe(schema.boolean()),
    })
  ),
});

export const datafeedIdSchema = schema.object({ datafeedId: schema.string() });

export const deleteDatafeedQuerySchema = schema.maybe(
  schema.object({ force: schema.maybe(schema.any()) })
);
