/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const scheduleBackfillRequestBodySchema = schema.object({
  ids: schema.arrayOf(
    schema.object({
      rule_id: schema.string(),
      doc_id: schema.maybe(schema.string()),
    }),
    { minSize: 1, maxSize: 10 }
  ),
  start: schema.string(),
  end: schema.maybe(schema.string()),
});

export const scheduleBackfillResponseBodySchema = schema.arrayOf(
  schema.object({
    rule_id: schema.string(),
    backfill_id: schema.nullable(schema.string()),
    backfill_runs: schema.arrayOf(schema.object({ start: schema.string(), end: schema.string() })),
  })
);
