/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { PluginInitializerContext, PluginConfigDescriptor } from 'src/core/server';
import { LogstashPlugin } from './plugin';

export const plugin = (context: PluginInitializerContext) => new LogstashPlugin(context);

export const config: PluginConfigDescriptor = {
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
};
