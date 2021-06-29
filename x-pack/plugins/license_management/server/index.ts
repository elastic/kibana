/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, PluginConfigDescriptor } from 'src/core/server';

import { LicenseManagementServerPlugin } from './plugin';
import { configSchema, LicenseManagementConfig } from './config';

export const plugin = (ctx: PluginInitializerContext) => new LicenseManagementServerPlugin();

export const config: PluginConfigDescriptor<LicenseManagementConfig> = {
  schema: configSchema,
  exposeToBrowser: {
    ui: true,
  },
};
