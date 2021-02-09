/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const jobsAndSpaces = schema.object({
  jobType: schema.string(),
  jobIds: schema.arrayOf(schema.string()),
  spaces: schema.arrayOf(schema.string()),
});

export const jobsAndCurrentSpace = schema.object({
  jobType: schema.string(),
  jobIds: schema.arrayOf(schema.string()),
});

export const syncJobObjects = schema.object({ simulate: schema.maybe(schema.boolean()) });

export const jobTypeSchema = schema.object({
  jobType: schema.string(),
});

export const canDeleteJobSchema = schema.object({
  /** List of job IDs. */
  jobIds: schema.arrayOf(schema.maybe(schema.string())),
});
