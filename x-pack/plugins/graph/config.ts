/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  savePolicy: schema.oneOf(
    [
      schema.literal('none'),
      schema.literal('config'),
      schema.literal('configAndData'),
      schema.literal('configAndDataWithConsent'),
    ],
    { defaultValue: 'configAndData' }
  ),
  canEditDrillDownUrls: schema.boolean({ defaultValue: true }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;
