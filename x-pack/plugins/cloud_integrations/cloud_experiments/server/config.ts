/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core/server';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  sdkKey: schema.conditional(
    schema.siblingRef('enabled'),
    true,
    schema.string({ minLength: 1 }),
    schema.maybe(schema.string())
  ),
  clientId: schema.conditional(
    schema.siblingRef('enabled'),
    true,
    schema.string({ minLength: 1 }),
    schema.maybe(schema.string())
  ),
  clientLogLevel: schema.oneOf(
    [
      schema.literal('none'),
      schema.literal('error'),
      schema.literal('warn'),
      schema.literal('info'),
      schema.literal('debug'),
    ],
    { defaultValue: 'none' }
  ),
});

export type CloudExperimentsConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<CloudExperimentsConfigType> = {
  exposeToBrowser: {
    clientId: true,
  },
  schema: configSchema,
};
