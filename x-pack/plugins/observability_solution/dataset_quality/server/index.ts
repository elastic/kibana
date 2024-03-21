/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core-plugins-server';

export async function plugin(initializerContext: PluginInitializerContext) {
  const { DatasetQualityServerPlugin } = await import('./plugin');
  return new DatasetQualityServerPlugin(initializerContext);
}

export { config } from '../common/plugin_config';
