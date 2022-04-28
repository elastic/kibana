/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

const criteriaFieldSchema = schema.object({
  fieldType: schema.maybe(schema.string()),
  fieldName: schema.string(),
  fieldValue: schema.any(),
});

export const anomaliesTableDataSchema = schema.object({
  jobIds: schema.arrayOf(schema.string()),
  criteriaFields: schema.arrayOf(criteriaFieldSchema),
  influencers: schema.arrayOf(
    schema.maybe(schema.object({ fieldName: schema.string(), fieldValue: schema.any() }))
  ),
  aggregationInterval: schema.string(),
  threshold: schema.number(),
  earliestMs: schema.number(),
  latestMs: schema.number(),
  dateFormatTz: schema.string(),
  maxRecords: schema.number(),
  maxExamples: schema.maybe(schema.number()),
  influencersFilterQuery: schema.maybe(schema.any()),
  functionDescription: schema.maybe(schema.nullable(schema.string())),
});

export const categoryDefinitionSchema = schema.object({
  jobId: schema.maybe(schema.string()),
  categoryId: schema.string(),
});

export const maxAnomalyScoreSchema = schema.object({
  jobIds: schema.arrayOf(schema.string()),
  earliestMs: schema.maybe(schema.number()),
  latestMs: schema.maybe(schema.number()),
});

export const categoryExamplesSchema = schema.object({
  jobId: schema.string(),
  categoryIds: schema.arrayOf(schema.string()),
  maxExamples: schema.number(),
});

export const anomalySearchSchema = schema.object({
  jobIds: schema.arrayOf(schema.string()),
  query: schema.any(),
});

const fieldConfig = schema.maybe(
  schema.object({
    applyTimeRange: schema.maybe(schema.boolean()),
    anomalousOnly: schema.maybe(schema.boolean()),
    sort: schema.object({
      by: schema.string(),
      order: schema.maybe(schema.string()),
    }),
  })
);

export const partitionFieldValuesSchema = schema.object({
  jobId: schema.string(),
  searchTerm: schema.maybe(schema.any()),
  criteriaFields: schema.arrayOf(criteriaFieldSchema),
  earliestMs: schema.number(),
  latestMs: schema.number(),
  fieldsConfig: schema.maybe(
    schema.object({
      partition_field: fieldConfig,
      over_field: fieldConfig,
      by_field: fieldConfig,
    })
  ),
});

export type FieldsConfig = TypeOf<typeof partitionFieldValuesSchema>['fieldsConfig'];
export type FieldConfig = TypeOf<typeof fieldConfig>;

export const getCategorizerStatsSchema = schema.nullable(
  schema.object({
    /**
     * Optional value to fetch the categorizer stats
     * where results are filtered by partition_by_value = value
     */
    partitionByValue: schema.maybe(schema.string()),
  })
);

export const getCategorizerStoppedPartitionsSchema = schema.object({
  /**
   * List of jobIds to fetch the categorizer partitions for
   */
  jobIds: schema.arrayOf(schema.string()),
  /**
   * Field to aggregate results by: 'job_id' or 'partition_field_value'
   * If by job_id, will return list of jobIds with at least one partition that have stopped
   * If by partition_field_value, it will return a list of categorizer stopped partitions for each job_id
   */
  fieldToBucket: schema.maybe(schema.string()),
});

export const getDatafeedResultsChartDataSchema = schema.object({
  /**
   * Job id to fetch the bucket results for
   */
  jobId: schema.string(),
  start: schema.number(),
  end: schema.number(),
});

export const getAnomalyChartsSchema = schema.object({
  jobIds: schema.arrayOf(schema.string()),
  influencers: schema.arrayOf(schema.any()),
  /**
   * Severity threshold
   */
  threshold: schema.number({ defaultValue: 0, min: 0, max: 99 }),
  earliestMs: schema.number(),
  latestMs: schema.number(),
  /**
   * Maximum amount of series data.
   */
  maxResults: schema.number({ defaultValue: 6, min: 1, max: 10 }),
  influencersFilterQuery: schema.maybe(schema.any()),
  /**
   * Optimal number of data points per chart
   */
  numberOfPoints: schema.number(),
  timeBounds: schema.object({
    min: schema.maybe(schema.number()),
    max: schema.maybe(schema.number()),
  }),
});
