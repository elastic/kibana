/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

export const aggregateOptionsSchema = schema.object({
  search: schema.maybe(schema.string()),
  defaultSearchOperator: schema.maybe(schema.oneOf([schema.literal('AND'), schema.literal('OR')])),
  searchFields: schema.maybe(schema.arrayOf(schema.string())),
  hasReference: schema.maybe(
    schema.object({
      type: schema.string(),
      id: schema.string(),
    })
  ),
  ruleTypeIds: schema.maybe(schema.arrayOf(schema.string())),
  consumers: schema.maybe(schema.arrayOf(schema.string())),
  // filter type is `string | KueryNode`, but `KueryNode` has no schema to import yet
  filter: schema.maybe(
    schema.oneOf([schema.string(), schema.recordOf(schema.string(), schema.any())])
  ),
  page: schema.maybe(schema.number()),
  perPage: schema.maybe(schema.number()),
});
