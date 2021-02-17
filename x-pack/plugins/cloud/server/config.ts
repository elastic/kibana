/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from 'kibana/server';

const apmConfigSchema = schema.object({
  url: schema.maybe(schema.string()),
  secret_token: schema.maybe(schema.string()),
  ui: schema.maybe(
    schema.object({
      url: schema.maybe(schema.string()),
    })
  ),
});

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  id: schema.maybe(schema.string()),
  apm: schema.maybe(apmConfigSchema),
  resetPasswordUrl: schema.maybe(schema.string()),
  deploymentUrl: schema.maybe(schema.string()),
  accountUrl: schema.maybe(schema.string()),
});

export type CloudConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<CloudConfigType> = {
  exposeToBrowser: {
    id: true,
    resetPasswordUrl: true,
    deploymentUrl: true,
    accountUrl: true,
  },
  schema: configSchema,
};
