/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '../../../../src/core/server';

import { MetricsEntitiesPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export const plugin = (initializerContext: PluginInitializerContext): MetricsEntitiesPlugin => {
  return new MetricsEntitiesPlugin(initializerContext);
};

export { MetricsEntitiesPluginSetup, MetricsEntitiesPluginStart } from './types';
