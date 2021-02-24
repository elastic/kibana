/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const categorizationFieldExamplesSchema = {
  indexPatternTitle: schema.string(),
  query: schema.any(),
  size: schema.number(),
  field: schema.string(),
  timeField: schema.maybe(schema.string()),
  start: schema.number(),
  end: schema.number(),
  analyzer: schema.any(),
  runtimeMappings: schema.maybe(schema.any()),
};

export const chartSchema = {
  indexPatternTitle: schema.string(),
  timeField: schema.maybe(schema.string()),
  start: schema.maybe(schema.number()),
  end: schema.maybe(schema.number()),
  intervalMs: schema.number(),
  query: schema.any(),
  aggFieldNamePairs: schema.arrayOf(schema.any()),
  splitFieldName: schema.maybe(schema.nullable(schema.string())),
  splitFieldValue: schema.maybe(schema.nullable(schema.string())),
  runtimeMappings: schema.maybe(schema.any()),
};

export const datafeedIdsSchema = schema.object({
  datafeedIds: schema.arrayOf(schema.maybe(schema.string())),
});

export const forceStartDatafeedSchema = schema.object({
  datafeedIds: schema.arrayOf(schema.maybe(schema.string())),
  start: schema.maybe(schema.number()),
  end: schema.maybe(schema.number()),
});

export const jobIdSchema = schema.object({
  /** Optional list of job IDs. */
  jobIds: schema.maybe(schema.string()),
});

export const jobIdsSchema = schema.object({
  /** Optional list of job IDs. */
  jobIds: schema.maybe(schema.arrayOf(schema.maybe(schema.string()))),
});

export const jobsWithTimerangeSchema = {
  dateFormatTz: schema.maybe(schema.string()),
};

export const lookBackProgressSchema = {
  jobId: schema.string(),
  start: schema.maybe(schema.number()),
  end: schema.maybe(schema.number()),
};

export const topCategoriesSchema = { jobId: schema.string(), count: schema.number() };

export const updateGroupsSchema = {
  jobs: schema.maybe(
    schema.arrayOf(
      schema.object({
        job_id: schema.maybe(schema.string()),
        groups: schema.arrayOf(schema.maybe(schema.string())),
      })
    )
  ),
};

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

export const jobsExistSchema = schema.object({
  jobIds: schema.arrayOf(schema.string()),
  allSpaces: schema.maybe(schema.boolean()),
});
