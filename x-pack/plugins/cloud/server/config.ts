/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

const apmSchema = schema.object({
  url: schema.maybe(schema.string()),
  secret_token: schema.maybe(schema.string()),
  ui: schema.maybe(schema.object({
    url: schema.maybe(schema.string()),
  })),
});

export const config = {
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    id: schema.maybe(schema.string()),
    apm: schema.maybe(apmSchema),
  }),
};

export type CloudConfigSchema = TypeOf<typeof config.schema>;
