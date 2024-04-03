/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const ruleTagsAggregationResultSchema = schema.object({
  tags: schema.object({
    buckets: schema.arrayOf(
      schema.object({
        key: schema.string(),
        doc_count: schema.number(),
      })
    ),
  }),
});
