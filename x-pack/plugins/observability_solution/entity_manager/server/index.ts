/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core-plugins-server';
import { EntityManagerConfig } from '../common/config';
import { EntityManagerServerPluginSetup, EntityManagerServerPluginStart, config } from './plugin';

export type { EntityManagerConfig, EntityManagerServerPluginSetup, EntityManagerServerPluginStart };
export { config };

export const plugin = async (context: PluginInitializerContext<EntityManagerConfig>) => {
  const { EntityManagerServerPlugin } = await import('./plugin');
  return new EntityManagerServerPlugin(context);
};
