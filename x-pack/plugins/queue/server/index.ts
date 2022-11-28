/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginConfigDescriptor } from '@kbn/core/server';
import { QueuePlugin, PluginSetup, PluginStart } from './plugin';
import { QueueConfig, configSchema } from './config';

export type { Worker } from './worker_registry';
export type { PluginSetup as QueuePluginSetup, PluginStart as QueuePluginStart };

export const plugin = () => new QueuePlugin();
export const config: PluginConfigDescriptor<QueueConfig> = {
  schema: configSchema,
};
