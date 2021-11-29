/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginConfigDescriptor } from 'kibana/server';
import { schema, TypeOf } from '@kbn/config-schema';

export const config: PluginConfigDescriptor = {
  exposeToBrowser: {
    ui: true,
  },
  schema: schema.maybe(
    schema.object({
      index: schema.maybe(schema.string()),
      ui: schema.maybe(
        schema.object({
          unsafe: schema.maybe(
            schema.object({
              monitorManagement: schema.maybe(
                schema.object({
                  enabled: schema.boolean(),
                })
              ),
            })
          ),
        })
      ),
      unsafe: schema.maybe(
        schema.object({
          service: schema.maybe(
            schema.object({
              enabled: schema.boolean(),
              username: schema.string(),
              password: schema.string(),
              manifestUrl: schema.string(),
              hosts: schema.maybe(schema.arrayOf(schema.string())),
            })
          ),
        })
      ),
    })
  ),
};

export type UptimeConfig = TypeOf<typeof config.schema>;
export interface UptimeUiConfig {
  ui?: TypeOf<typeof config.schema>['ui'];
}
