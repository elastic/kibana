/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core-plugins-server';
import { StreamEntitiesManagerConfig } from '../common/config';
import {
  StreamEntitiesManagerServerPluginSetup,
  StreamEntitiesManagerServerPluginStart,
  config,
} from './plugin';
import { StreamEntitiesManagerRouteRepository } from './routes';

export type {
  StreamEntitiesManagerConfig as StreamEntitiesManagerConfig,
  StreamEntitiesManagerServerPluginSetup,
  StreamEntitiesManagerServerPluginStart,
  StreamEntitiesManagerRouteRepository,
};
export { config };

export const plugin = async (context: PluginInitializerContext<StreamEntitiesManagerConfig>) => {
  const { StreamEntitiesManagerServerPlugin } = await import('./plugin');
  return new StreamEntitiesManagerServerPlugin(context);
};
