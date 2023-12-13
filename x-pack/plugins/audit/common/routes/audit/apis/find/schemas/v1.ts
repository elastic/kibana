/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const findAuditBodySchema = schema.object({
  per_page: schema.maybe(schema.number()),
  page: schema.maybe(schema.number()),
  sort_field: schema.maybe(schema.string()),
  sort_order: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
  search: schema.maybe(schema.string()),
  fields: schema.maybe(schema.arrayOf(schema.string())),
  filter: schema.maybe(schema.string()),
});
