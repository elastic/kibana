/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

export const scheduleBackfillOptionsSchema = schema.object({
  ids: schema.arrayOf(
    schema.object({
      ruleId: schema.string(),
      docId: schema.maybe(schema.string()),
    }),
    { minSize: 1, maxSize: 10 }
  ),
  start: schema.string(),
  end: schema.maybe(schema.string()),
});
