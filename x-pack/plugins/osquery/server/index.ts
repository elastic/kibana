/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '../../../../src/core/server';
import { OsqueryPlugin } from './plugin';
import { ConfigSchema } from './config';

export const config = {
  schema: ConfigSchema,
  exposeToBrowser: {
    enabled: true,
    actionEnabled: true,
    savedQueries: true,
    packs: true,
  },
};
export function plugin(initializerContext: PluginInitializerContext) {
  return new OsqueryPlugin(initializerContext);
}

export { OsqueryPluginSetup, OsqueryPluginStart } from './types';
