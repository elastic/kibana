/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

const metricsSchema = z.object({
  failedTransactionRate: z.number().optional(),
  latency: z.number().optional(),
  throughput: z.number().optional(),
  logErrorRate: z.number().optional(),
  logRate: z.number().optional(),
});

const entitySchema = z.object({
  id: z.string(),
  definition_id: z.string(),
  definition_version: z.string(),
  display_name: z.string(),
  last_seen_timestamp: z.string(),
  identity_fields: z.array(z.string()),
  schema_version: z.string(),
  type: z.string(),
  metrics: metricsSchema,
});

const entitySourceSchema = z.object({
  dataStream: z.string().optional(),
});

const entityWithSourceSchema = z.intersection(
  entitySchema,
  z.object({
    sources: z.array(entitySourceSchema),
  })
);

type EntityWithSource = z.output<typeof entityWithSourceSchema>;
type EntitySource = z.output<typeof entitySourceSchema>;

export { entitySchema, entityWithSourceSchema };
export type { EntityWithSource, EntitySource };
