/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf, schema } from '@kbn/config-schema';

export const ConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  importBufferSize: schema.number({ defaultValue: 1000, min: 1 }),
  listIndex: schema.string({ defaultValue: '.lists' }),
  listItemIndex: schema.string({ defaultValue: '.items' }),
  maxImportPayloadBytes: schema.number({ defaultValue: 40000000, min: 1 }),
});

export type ConfigType = TypeOf<typeof ConfigSchema>;
