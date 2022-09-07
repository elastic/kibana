/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core/server';

const launchDarklySchema = schema.object({
  sdk_key: schema.string({ minLength: 1 }),
  client_id: schema.string({ minLength: 1 }),
  client_log_level: schema.oneOf(
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

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  launch_darkly: schema.conditional(
    schema.siblingRef('enabled'),
    true,
    launchDarklySchema,
    schema.maybe(launchDarklySchema)
  ),
});

export type CloudExperimentsConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<CloudExperimentsConfigType> = {
  exposeToBrowser: {
    launch_darkly: {
      client_id: true,
    },
  },
  schema: configSchema,
};
