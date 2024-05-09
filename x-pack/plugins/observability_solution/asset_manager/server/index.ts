/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core-plugins-server';
import { AssetManagerConfig } from '../common/config';
import { AssetManagerServerPluginSetup, AssetManagerServerPluginStart, config } from './plugin';
import type { WriteSamplesPostBody } from './routes/sample_assets';

export type {
  AssetManagerConfig,
  WriteSamplesPostBody,
  AssetManagerServerPluginSetup,
  AssetManagerServerPluginStart,
};
export { config };

export const plugin = async (context: PluginInitializerContext<AssetManagerConfig>) => {
  const { AssetManagerServerPlugin } = await import('./plugin');
  return new AssetManagerServerPlugin(context);
};
