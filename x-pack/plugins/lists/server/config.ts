/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf, schema } from '@kbn/config-schema';

export const ConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  importBufferSize: schema.number({ defaultValue: 1000, min: 1 }),
  importTimeout: schema.number({ defaultValue: 300000, max: 6000000, min: 120000 }), // Default value is 300000 (3 minutes), maximum of 6000000 (100 minutes), minimum of 120000 (2 minutes)
  listIndex: schema.string({ defaultValue: '.lists' }),
  listItemIndex: schema.string({ defaultValue: '.items' }),
  maxImportPayloadBytes: schema.number({ defaultValue: 9000000, min: 1 }),
});

export type ConfigType = TypeOf<typeof ConfigSchema>;
