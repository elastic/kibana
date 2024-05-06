/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf, schema } from '@kbn/config-schema';

export const ConfigSchema = schema.object({
  importBufferSize: schema.number({ defaultValue: 1000, min: 1 }),
  importTimeout: schema.duration({
    defaultValue: '5m',
    validate: (value) => {
      if (value.asMinutes() < 2) {
        throw new Error('duration cannot be less than 2 minutes');
      } else if (value.asMinutes() > 30) {
        throw new Error('duration cannot be greater than 30 minutes');
      }
    },
  }),
  listIndex: schema.string({ defaultValue: '.lists' }),
  listItemIndex: schema.string({ defaultValue: '.items' }),
  maxExceptionsImportSize: schema.number({ defaultValue: 10000, min: 1 }),
  maxImportPayloadBytes: schema.number({ defaultValue: 9000000, min: 1 }),
});

export type ConfigType = TypeOf<typeof ConfigSchema>;
