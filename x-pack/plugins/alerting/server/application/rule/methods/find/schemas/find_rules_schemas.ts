/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const findRulesOptionsSchema = schema.object({
  perPage: schema.maybe(schema.number()),
  page: schema.maybe(schema.number()),
  search: schema.maybe(schema.string()),
  defaultSearchOperator: schema.maybe(schema.oneOf([schema.literal('AND'), schema.literal('OR')])),
  searchFields: schema.maybe(schema.arrayOf(schema.string())),
  sortField: schema.maybe(schema.string()),
  sortOrder: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
  hasReference: schema.maybe(
    schema.object({
      type: schema.string(),
      id: schema.string(),
    })
  ),
  fields: schema.maybe(schema.arrayOf(schema.string())),
  filter: schema.maybe(
    schema.oneOf([schema.string(), schema.recordOf(schema.string(), schema.any())])
  ),
  filterConsumers: schema.maybe(schema.arrayOf(schema.string())),
});

export const findRulesParamsSchema = schema.object({
  options: schema.maybe(findRulesOptionsSchema),
  excludeFromPublicApi: schema.maybe(schema.boolean()),
  includeSnoozeData: schema.maybe(schema.boolean()),
  featureIds: schema.maybe(schema.arrayOf(schema.string())),
});
