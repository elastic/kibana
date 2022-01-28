/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const jobTypeLiterals = schema.oneOf([
  schema.literal('anomaly-detector'),
  schema.literal('data-frame-analytics'),
]);

export const jobTypeSchema = schema.object({ jobType: jobTypeLiterals });

export const updateJobsSpaces = schema.object({
  jobType: jobTypeLiterals,
  jobIds: schema.arrayOf(schema.string()),
  spacesToAdd: schema.arrayOf(schema.string()),
  spacesToRemove: schema.arrayOf(schema.string()),
});

export const updateModelsSpaces = schema.object({
  modelIds: schema.arrayOf(schema.string()),
  spacesToAdd: schema.arrayOf(schema.string()),
  spacesToRemove: schema.arrayOf(schema.string()),
});

export const jobsAndCurrentSpace = schema.object({
  jobType: jobTypeLiterals,
  jobIds: schema.arrayOf(schema.string()),
});

export const syncJobObjects = schema.object({ simulate: schema.maybe(schema.boolean()) });

export const syncCheckSchema = schema.object({ jobType: schema.maybe(schema.string()) });

export const canDeleteJobSchema = schema.object({
  /** List of job IDs. */
  jobIds: schema.arrayOf(schema.string()),
});
