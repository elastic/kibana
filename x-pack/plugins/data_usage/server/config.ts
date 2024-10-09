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
});

export type DataUsageConfigType = TypeOf<typeof configSchema>;

export const createConfig = (context: PluginInitializerContext): DataUsageConfigType => {
  const pluginConfig = context.config.get<TypeOf<typeof configSchema>>();

  return {
    ...pluginConfig,
  };
};
