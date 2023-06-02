/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, Logger } from '@kbn/core/server';
import { ExportTypesPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext, logger: Logger) {
  return new ExportTypesPlugin(initializerContext, logger);
}

export type { ExportTypesPluginSetup, ExportTypesPluginStart } from './types';
