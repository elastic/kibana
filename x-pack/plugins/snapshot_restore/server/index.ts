/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, PluginConfigDescriptor } from 'kibana/server';
import { SnapshotRestoreServerPlugin } from './plugin';
import { configSchema, SnapshotRestoreConfig } from './config';

export const plugin = (ctx: PluginInitializerContext) => new SnapshotRestoreServerPlugin(ctx);

export const config: PluginConfigDescriptor<SnapshotRestoreConfig> = {
  schema: configSchema,
  exposeToBrowser: {
    slm_ui: true,
  },
};
