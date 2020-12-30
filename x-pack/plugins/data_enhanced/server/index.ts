/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginConfigDescriptor, PluginInitializerContext } from 'kibana/server';
import { EnhancedDataServerPlugin } from './plugin';
import { configSchema, ConfigSchema } from '../config';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    search: true,
  },
  schema: configSchema,
};

export function plugin(initializerContext: PluginInitializerContext<ConfigSchema>) {
  return new EnhancedDataServerPlugin(initializerContext);
}

export { ENHANCED_ES_SEARCH_STRATEGY, EQL_SEARCH_STRATEGY } from '../common';

export { EnhancedDataServerPlugin as Plugin };
