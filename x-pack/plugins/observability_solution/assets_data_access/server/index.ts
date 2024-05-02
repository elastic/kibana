/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import type { AssetsDataAccessPluginSetup, AssetsDataAccessPluginStart } from './plugin';

export type { AssetsDataAccessPluginSetup, AssetsDataAccessPluginStart };

export async function plugin(initializerContext: PluginInitializerContext) {
  const { AssetsDataAccessPlugin } = await import('./plugin');
  return new AssetsDataAccessPlugin(initializerContext);
}
