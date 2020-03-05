/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
};

export const datafeedIdsSchema = { datafeedIds: schema.arrayOf(schema.maybe(schema.string())) };

export const forceStartDatafeedSchema = {
  datafeedIds: schema.arrayOf(schema.maybe(schema.string())),
  start: schema.maybe(schema.number()),
  end: schema.maybe(schema.number()),
};

export const jobIdsSchema = {
  jobIds: schema.maybe(
    schema.oneOf([schema.string(), schema.arrayOf(schema.maybe(schema.string()))])
  ),
};

export const jobsWithTimerangeSchema = { dateFormatTz: schema.maybe(schema.string()) };

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
