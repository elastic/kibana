/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';

export const ListWithKuerySchema = schema.object({
  page: schema.number({ defaultValue: 1 }),
  perPage: schema.number({ defaultValue: 20 }),
  kuery: schema.maybe(schema.string()),
});

export type ListWithKuery = TypeOf<typeof ListWithKuerySchema>;
