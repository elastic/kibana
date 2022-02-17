/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { PluginInitializerContext } from '../../../../src/core/server';

import { MetricsEntitiesPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export const plugin = (initializerContext: PluginInitializerContext): MetricsEntitiesPlugin => {
  return new MetricsEntitiesPlugin(initializerContext);
};

export type { MetricsEntitiesPluginSetup, MetricsEntitiesPluginStart } from './types';

export const config = {
  schema: schema.object({
    // This plugin is experimental and should be disabled by default.
    enabled: schema.boolean({ defaultValue: false }),
  }),
};
