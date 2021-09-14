/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { analysisConfigSchema, anomalyDetectionJobSchema } from './anomaly_detectors_schema';
import { datafeedConfigSchema, indicesOptionsSchema } from './datafeeds_schema';
import { runtimeMappingsSchema } from './runtime_mappings_schema';
import { ES_AGGREGATION } from '../../../common/constants/aggregation_types';

export const estimateBucketSpanSchema = schema.object({
  aggTypes: schema.arrayOf(
    schema.nullable(
      schema.oneOf([
        schema.literal(ES_AGGREGATION.COUNT),
        schema.literal(ES_AGGREGATION.AVG),
        schema.literal(ES_AGGREGATION.MAX),
        schema.literal(ES_AGGREGATION.MIN),
        schema.literal(ES_AGGREGATION.SUM),
        schema.literal(ES_AGGREGATION.PERCENTILES),
        schema.literal(ES_AGGREGATION.CARDINALITY),
      ])
    )
  ),
  duration: schema.object({ start: schema.number(), end: schema.number() }),
  fields: schema.arrayOf(schema.nullable(schema.string())),
  filters: schema.maybe(schema.arrayOf(schema.any())),
  index: schema.string(),
  query: schema.any(),
  splitField: schema.maybe(schema.string()),
  timeField: schema.maybe(schema.string()),
  runtimeMappings: schema.maybe(runtimeMappingsSchema),
  indicesOptions: schema.maybe(indicesOptionsSchema),
});

export const modelMemoryLimitSchema = schema.object({
  datafeedConfig: datafeedConfigSchema,
  analysisConfig: analysisConfigSchema,
  indexPattern: schema.string(),
  query: schema.any(),
  timeFieldName: schema.string(),
  earliestMs: schema.number(),
  latestMs: schema.number(),
});

export const validateJobSchema = schema.object({
  duration: schema.maybe(
    schema.object({
      start: schema.maybe(schema.number()),
      end: schema.maybe(schema.number()),
    })
  ),
  fields: schema.maybe(schema.any()),
  job: schema.object({
    ...anomalyDetectionJobSchema,
    datafeed_config: datafeedConfigSchema,
  }),
});

export const validateCardinalitySchema = schema.object({
  ...anomalyDetectionJobSchema,
  datafeed_config: datafeedConfigSchema,
});
