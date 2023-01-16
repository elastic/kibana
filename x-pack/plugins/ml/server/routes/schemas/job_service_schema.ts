/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { anomalyDetectionJobSchema } from './anomaly_detectors_schema';
import { datafeedConfigSchema, indicesOptionsSchema } from './datafeeds_schema';
import { runtimeMappingsSchema } from './runtime_mappings_schema';

export const categorizationFieldExamplesSchema = {
  indexPatternTitle: schema.string(),
  query: schema.any(),
  size: schema.number(),
  field: schema.string(),
  timeField: schema.maybe(schema.string()),
  start: schema.number(),
  end: schema.number(),
  analyzer: schema.any(),
  runtimeMappings: runtimeMappingsSchema,
  indicesOptions: indicesOptionsSchema,
};

export const basicChartSchema = {
  indexPatternTitle: schema.string(),
  timeField: schema.string(),
  start: schema.number(),
  end: schema.number(),
  intervalMs: schema.number(),
  query: schema.any(),
  aggFieldNamePairs: schema.arrayOf(schema.any()),
  splitFieldName: schema.nullable(schema.string()),
  splitFieldValue: schema.nullable(schema.string()),
  runtimeMappings: schema.maybe(runtimeMappingsSchema),
  indicesOptions: schema.maybe(indicesOptionsSchema),
};

export const populationChartSchema = {
  indexPatternTitle: schema.string(),
  timeField: schema.string(),
  start: schema.number(),
  end: schema.number(),
  intervalMs: schema.number(),
  query: schema.any(),
  aggFieldNamePairs: schema.arrayOf(schema.any()),
  splitFieldName: schema.nullable(schema.string()),
  splitFieldValue: schema.maybe(schema.nullable(schema.string())),
  runtimeMappings: schema.maybe(runtimeMappingsSchema),
  indicesOptions: schema.maybe(indicesOptionsSchema),
};

export const datafeedIdsSchema = schema.object({
  datafeedIds: schema.arrayOf(schema.string()),
});

export const forceStartDatafeedSchema = schema.object({
  datafeedIds: schema.arrayOf(schema.string()),
  start: schema.maybe(schema.number()),
  end: schema.maybe(schema.number()),
});

export const jobIdsSchema = schema.object({
  /** List of job IDs. */
  jobIds: schema.arrayOf(schema.string()),
});

export const deleteJobsSchema = schema.object({
  /** List of job IDs. */
  jobIds: schema.arrayOf(schema.string()),
  deleteUserAnnotations: schema.maybe(schema.boolean()),
});

export const optionalJobIdsSchema = schema.object({
  /** Optional list of job IDs. */
  jobIds: schema.maybe(schema.arrayOf(schema.string())),
});

export const jobsWithTimerangeSchema = schema.object({
  dateFormatTz: schema.maybe(schema.string()),
});

export const lookBackProgressSchema = {
  jobId: schema.string(),
  start: schema.number(),
  end: schema.number(),
};

export const topCategoriesSchema = { jobId: schema.string(), count: schema.number() };

export const updateGroupsSchema = schema.object({
  jobs: schema.arrayOf(
    schema.object({
      jobId: schema.string(),
      groups: schema.arrayOf(schema.string()),
    })
  ),
});

export const revertModelSnapshotSchema = schema.object({
  jobId: schema.string(),
  snapshotId: schema.string(),
  replay: schema.boolean(),
  end: schema.maybe(schema.number()),
  deleteInterveningResults: schema.maybe(schema.boolean()),
  calendarEvents: schema.maybe(
    schema.arrayOf(
      schema.object({
        start: schema.number(),
        end: schema.number(),
        description: schema.string(),
      })
    )
  ),
});

export const datafeedPreviewSchema = schema.object(
  {
    job: schema.maybe(schema.object(anomalyDetectionJobSchema)),
    datafeed: schema.maybe(datafeedConfigSchema),
    datafeedId: schema.maybe(schema.string()),
  },
  {
    validate: (v) => {
      const msg = 'supply either a datafeed_id for an existing job or a job and datafeed config';
      if (v.datafeedId !== undefined && (v.job !== undefined || v.datafeed !== undefined)) {
        // datafeed_id is supplied but job and datafeed configs are also supplied
        return msg;
      }

      if (v.datafeedId === undefined && (v.job === undefined || v.datafeed === undefined)) {
        // datafeed_id is not supplied but job or datafeed configs are missing
        return msg;
      }

      if (v.datafeedId === undefined && v.job === undefined && v.datafeed === undefined) {
        // everything is missing
        return msg;
      }
    },
  }
);

export const jobsExistSchema = schema.object({
  jobIds: schema.arrayOf(schema.string()),
  allSpaces: schema.maybe(schema.boolean()),
});

export const bulkCreateSchema = schema.oneOf([
  schema.arrayOf(
    schema.object({
      job: schema.object(anomalyDetectionJobSchema),
      datafeed: datafeedConfigSchema,
    })
  ),
  schema.object({
    job: schema.object(anomalyDetectionJobSchema),
    datafeed: datafeedConfigSchema,
  }),
]);
