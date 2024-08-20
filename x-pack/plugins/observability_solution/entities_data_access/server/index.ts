/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import type { EntitiesDataAccessPluginSetup, EntitiesDataAccessPluginStart } from './plugin';

export type { EntitiesDataAccessPluginSetup, EntitiesDataAccessPluginStart };

export async function plugin(initializerContext: PluginInitializerContext) {
  const { EntitiesDataAccessPlugin } = await import('./plugin');
  return new EntitiesDataAccessPlugin(initializerContext);
}
