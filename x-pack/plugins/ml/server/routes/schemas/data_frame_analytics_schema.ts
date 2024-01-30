/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CreateDataViewApiResponseSchema } from '@kbn/ml-data-view-utils/types/api_create_response_schema';

import { runtimeMappingsSchema } from './runtime_mappings_schema';

export const dataFrameAnalyticsJobConfigSchema = schema.object({
  description: schema.maybe(schema.string()),
  _meta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  dest: schema.object({
    index: schema.string(),
    results_field: schema.maybe(schema.string()),
  }),
  source: schema.object({
    index: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
    query: schema.maybe(schema.any()),
    runtime_mappings: runtimeMappingsSchema,
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
  max_num_threads: schema.maybe(schema.number()),
});

export const dataFrameAnalyticsEvaluateSchema = schema.object({
  index: schema.string(),
  query: schema.maybe(schema.any()),
  evaluation: schema.maybe(
    schema.object({
      regression: schema.maybe(schema.any()),
      classification: schema.maybe(schema.any()),
      outlier_detection: schema.maybe(schema.any()),
    })
  ),
});

export const dataFrameAnalyticsExplainSchema = schema.object({
  description: schema.maybe(schema.string()),
  dest: schema.maybe(schema.any()),
  /** Source */
  source: schema.object({
    index: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
    query: schema.maybe(schema.any()),
    runtime_mappings: runtimeMappingsSchema,
  }),
  analysis: schema.any(),
  analyzed_fields: schema.maybe(schema.any()),
  model_memory_limit: schema.maybe(schema.string()),
  max_num_threads: schema.maybe(schema.number()),
  _meta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
});

export const dataFrameAnalyticsIdSchema = schema.object({
  /**
   * Analytics ID
   */
  analyticsId: schema.string(),
});

export const dataFrameAnalyticsQuerySchema = schema.object({
  /**
   * Analytics Query
   */
  excludeGenerated: schema.maybe(schema.boolean()),
  size: schema.maybe(schema.number()),
});

export const deleteDataFrameAnalyticsJobSchema = schema.object({
  /**
   * Analytics Destination Index
   */
  deleteDestIndex: schema.maybe(schema.boolean()),
  deleteDestDataView: schema.maybe(schema.boolean()),
  force: schema.maybe(schema.boolean()),
});

export const dataFrameAnalyticsJobUpdateSchema = schema.object({
  description: schema.maybe(schema.string()),
  model_memory_limit: schema.maybe(schema.string()),
  allow_lazy_start: schema.maybe(schema.boolean()),
  max_num_threads: schema.maybe(schema.number()),
  _meta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
});

export const stopsDataFrameAnalyticsJobQuerySchema = schema.object({
  force: schema.maybe(schema.boolean()),
});

export const dataFrameAnalyticsJobsExistSchema = schema.object({
  analyticsIds: schema.arrayOf(schema.string()),
  allSpaces: schema.maybe(schema.boolean()),
});

export const dataFrameAnalyticsMapQuerySchema = schema.maybe(
  schema.object({ treatAsRoot: schema.maybe(schema.any()), type: schema.maybe(schema.string()) })
);

export const dataFrameAnalyticsNewJobCapsParamsSchema = schema.object({
  indexPattern: schema.string(),
});

export const dataFrameAnalyticsNewJobCapsQuerySchema = schema.maybe(
  schema.object({ rollup: schema.maybe(schema.string()) })
);

interface DataFrameAnalyticsJobsCreated {
  id: string;
}
interface CreatedError {
  id: string;
  error: any;
}

export interface PutDataFrameAnalyticsResponseSchema extends CreateDataViewApiResponseSchema {
  dataFrameAnalyticsJobsCreated: DataFrameAnalyticsJobsCreated[];
  dataFrameAnalyticsJobsErrors: CreatedError[];
}
