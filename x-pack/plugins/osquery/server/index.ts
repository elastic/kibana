/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { OsqueryPlugin } from './plugin';
import type { ConfigType } from '../common/config';
import { ConfigSchema } from '../common/config';

export const config: PluginConfigDescriptor<ConfigType> = {
  schema: ConfigSchema,
  exposeToBrowser: {
    actionEnabled: true,
  },
};
export function plugin(initializerContext: PluginInitializerContext) {
  return new OsqueryPlugin(initializerContext);
}

export type { OsqueryPluginSetup, OsqueryPluginStart } from './types';
