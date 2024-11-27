/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { SLOConfig, configSchema } from '../common/config';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export async function plugin(ctx: PluginInitializerContext<SLOConfig>) {
  const { SLOPlugin } = await import('./plugin');
  return new SLOPlugin(ctx);
}

export type { SloClient } from './client';

export type { SLOServerSetup, SLOServerStart } from './types';

export const config: PluginConfigDescriptor<SLOConfig> = {
  schema: configSchema,
  exposeToBrowser: {
    experimental: true,
  },
};
