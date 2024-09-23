/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';

export const ListWithKuerySchema = schema.object({
  page: schema.maybe(schema.number({ defaultValue: 1 })),
  perPage: schema.maybe(schema.number({ defaultValue: 20 })),
  sortField: schema.maybe(schema.string()),
  sortOrder: schema.maybe(schema.oneOf([schema.literal('desc'), schema.literal('asc')])),
  showUpgradeable: schema.maybe(schema.boolean()),
  kuery: schema.maybe(
    schema.oneOf([
      schema.string(),
      schema.any(), // KueryNode
    ])
  ),
});

export const BulkRequestBodySchema = schema.object({
  ids: schema.arrayOf(schema.string(), { minSize: 1 }),
  ignoreMissing: schema.maybe(schema.boolean()),
});

export type ListWithKuery = TypeOf<typeof ListWithKuerySchema>;
