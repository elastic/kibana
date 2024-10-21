/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext } from '@kbn/core/server';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  autoops: schema.maybe(
    schema.object({
      enabled: schema.boolean({ defaultValue: false }),
      api: schema.maybe(
        schema.object({
          url: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
          tls: schema.maybe(
            schema.object({
              certificate: schema.maybe(schema.string()),
              key: schema.maybe(schema.string()),
              ca: schema.maybe(schema.string()),
            })
          ),
        })
      ),
    })
  ),
});

export type DataUsageConfigType = TypeOf<typeof configSchema>;

export const createConfig = (context: PluginInitializerContext): DataUsageConfigType => {
  const pluginConfig = context.config.get<TypeOf<typeof configSchema>>();

  return {
    ...pluginConfig,
  };
};
