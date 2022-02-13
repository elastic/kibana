/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginConfigDescriptor } from 'kibana/server';
import { schema, TypeOf } from '@kbn/config-schema';
import { sslSchema } from '@kbn/server-http-tools';

const serviceConfig = schema.object({
  username: schema.maybe(schema.string()),
  password: schema.maybe(schema.string()),
  manifestUrl: schema.maybe(schema.string()),
  hosts: schema.maybe(schema.arrayOf(schema.string())),
  syncInterval: schema.maybe(schema.string()),
  tls: schema.maybe(sslSchema),
  devUrl: schema.maybe(schema.string()),
});

const uptimeConfig = schema.object({
  index: schema.maybe(schema.string()),
  ui: schema.maybe(
    schema.object({
      monitorManagement: schema.maybe(
        schema.object({
          enabled: schema.boolean(),
        })
      ),
    })
  ),
  service: schema.maybe(serviceConfig),
});

export const config: PluginConfigDescriptor = {
  exposeToBrowser: {
    ui: true,
  },
  schema: uptimeConfig,
};

export type UptimeConfig = TypeOf<typeof uptimeConfig>;
export type ServiceConfig = TypeOf<typeof serviceConfig>;

export interface UptimeUiConfig {
  ui?: TypeOf<typeof config.schema>['ui'];
}
