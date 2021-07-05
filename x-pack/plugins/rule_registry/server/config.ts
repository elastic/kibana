/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const config = {
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    write: schema.object({
      enabled: schema.boolean({ defaultValue: false }),
    }),
    index: schema.string({ defaultValue: '.alerts' }),
  }),
};

export type RuleRegistryPluginConfig = TypeOf<typeof config.schema>;
