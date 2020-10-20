/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

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

export const partitionFieldValuesSchema = schema.object({
  jobId: schema.string(),
  searchTerm: schema.maybe(schema.any()),
  criteriaFields: schema.arrayOf(criteriaFieldSchema),
  earliestMs: schema.number(),
  latestMs: schema.number(),
});

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
