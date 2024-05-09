/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, PluginConfigDescriptor } from '@kbn/core/server';
import { configSchema, type ConfigSchema } from '../common/config';

export const plugin = async (ctx: PluginInitializerContext) => {
  const { TransformServerPlugin } = await import('./plugin');
  return new TransformServerPlugin(ctx);
};

export const config: PluginConfigDescriptor<ConfigSchema> = {
  schema: configSchema,
  exposeToBrowser: {
    experimental: true,
  },
};

export { registerTransformHealthRuleType } from './lib/alerting';
