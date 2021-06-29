/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, PluginConfigDescriptor } from 'src/core/server';
import { UpgradeAssistantServerPlugin } from './plugin';
import { configSchema, Config } from '../common/config';

export const plugin = (ctx: PluginInitializerContext) => {
  return new UpgradeAssistantServerPlugin(ctx);
};

export const config: PluginConfigDescriptor<Config> = {
  schema: configSchema,
  exposeToBrowser: {
    enabled: true,
    readonly: true,
  },
};
