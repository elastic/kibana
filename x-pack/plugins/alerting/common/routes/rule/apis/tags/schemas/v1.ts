/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { DEFAULT_TAGS_PER_PAGEV1 } from '../constants/v1';

export const ruleTagsRequestQuerySchema = schema.object({
  page: schema.number({ defaultValue: 1, min: 1 }),
  per_page: schema.maybe(schema.number({ defaultValue: DEFAULT_TAGS_PER_PAGEV1, min: 1 })),
  search: schema.maybe(schema.string()),
});

export const ruleTagsFormattedResponseSchema = schema.object({
  total: schema.number(),
  page: schema.number(),
  perPage: schema.number(),
  data: schema.arrayOf(schema.string()),
});
