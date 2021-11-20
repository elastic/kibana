/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf, schema } from '@kbn/config-schema';

export const ConfigSchema = schema.object({
  actionEnabled: schema.boolean({ defaultValue: false }),
  savedQueries: schema.boolean({ defaultValue: true }),
  packs: schema.boolean({ defaultValue: true }),
});

export type ConfigType = TypeOf<typeof ConfigSchema>;
