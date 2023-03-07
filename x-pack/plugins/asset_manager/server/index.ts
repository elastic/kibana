/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core-plugins-server';
import { AssetManagerServerPlugin, config, AssetManagerConfig } from './plugin';

export type { AssetManagerConfig };
export { config };

export const plugin = (context: PluginInitializerContext<AssetManagerConfig>) =>
  new AssetManagerServerPlugin(context);
