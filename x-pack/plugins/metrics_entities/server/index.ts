/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginConfigDescriptor, PluginInitializerContext } from '../../../../src/core/server';

import { ConfigSchema } from './config';
import { MetricsEntitiesPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export const config: PluginConfigDescriptor = {
  deprecations: ({ deprecate }) => [deprecate('enabled', '8.0.0')],
  schema: ConfigSchema,
};
export const plugin = (initializerContext: PluginInitializerContext): MetricsEntitiesPlugin => {
  return new MetricsEntitiesPlugin(initializerContext);
};

export { MetricsEntitiesPluginSetup, MetricsEntitiesPluginStart } from './types';
