/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const dataAnalyticsJobConfigSchema = schema.object({
  description: schema.maybe(schema.string()),
  dest: schema.object({
    index: schema.string(),
    results_field: schema.maybe(schema.string()),
  }),
  source: schema.object({
    index: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
    query: schema.maybe(schema.any()),
    _source: schema.maybe(
      schema.object({
        /** Fields to include in results */
        includes: schema.maybe(schema.arrayOf(schema.maybe(schema.string()))),
        /** Fields to exclude from results */
        excludes: schema.maybe(schema.arrayOf(schema.maybe(schema.string()))),
      })
    ),
  }),
  allow_lazy_start: schema.maybe(schema.boolean()),
  analysis: schema.any(),
  analyzed_fields: schema.any(),
  model_memory_limit: schema.string(),
});

export const dataAnalyticsEvaluateSchema = schema.object({
  index: schema.string(),
  query: schema.maybe(schema.any()),
  evaluation: schema.maybe(
    schema.object({
      regression: schema.maybe(schema.any()),
      classification: schema.maybe(schema.any()),
    })
  ),
});

export const dataAnalyticsExplainSchema = schema.object({
  description: schema.maybe(schema.string()),
  dest: schema.maybe(schema.any()),
  /** Source */
  source: schema.object({
    index: schema.string(),
    query: schema.maybe(schema.any()),
  }),
  analysis: schema.any(),
  analyzed_fields: schema.maybe(schema.any()),
  model_memory_limit: schema.maybe(schema.string()),
});

export const analyticsIdSchema = schema.object({
  /**
   * Analytics ID
   */
  analyticsId: schema.string(),
});

export const deleteDataFrameAnalyticsJobSchema = schema.object({
  /**
   * Analytics Destination Index
   */
  deleteDestIndex: schema.maybe(schema.boolean()),
  deleteDestIndexPattern: schema.maybe(schema.boolean()),
});

export const dataAnalyticsJobUpdateSchema = schema.object({
  description: schema.maybe(schema.string()),
  model_memory_limit: schema.maybe(schema.string()),
  allow_lazy_start: schema.maybe(schema.boolean()),
});

export const stopsDataFrameAnalyticsJobQuerySchema = schema.object({
  force: schema.maybe(schema.boolean()),
});
