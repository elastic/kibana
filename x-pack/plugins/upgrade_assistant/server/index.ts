/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PluginInitializerContext, PluginConfigDescriptor } from 'src/core/server';
import { UpgradeAssistantServerPlugin } from './plugin';
import { configSchema } from '../common/config';

export const plugin = (ctx: PluginInitializerContext) => {
  return new UpgradeAssistantServerPlugin(ctx);
};

export const config: PluginConfigDescriptor = {
  schema: configSchema,
  exposeToBrowser: {
    enabled: true,
  },
};
