/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';

export const ListWithKuerySchema = schema.object({
  page: schema.maybe(schema.number({ defaultValue: 1 })),
  perPage: schema.maybe(schema.number({ defaultValue: 20 })),
  sortField: schema.maybe(schema.string()),
  sortOrder: schema.maybe(schema.oneOf([schema.literal('desc'), schema.literal('asc')])),
  kuery: schema.maybe(schema.string()),
});

export type ListWithKuery = TypeOf<typeof ListWithKuerySchema>;
