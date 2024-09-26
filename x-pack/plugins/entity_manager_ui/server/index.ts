/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core-plugins-server';
import { EntityManagerUIServerStart, EntityManagerUIServerSetup, config } from './plugin';

export type { EntityManagerUIServerStart, EntityManagerUIServerSetup };
export { config };

export const plugin = async (context: PluginInitializerContext<{}>) => {
  const { EntityManagerUIServerPlugin } = await import('./plugin');
  return new EntityManagerUIServerPlugin(context);
};
