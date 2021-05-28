/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext, PluginConfigDescriptor } from 'src/core/server';

import { EnterpriseSearchPlugin } from './plugin';

export { config, configSchema } from './lib/enterprise_search_config';

export const plugin = (initializerContext: PluginInitializerContext) => {
  return new EnterpriseSearchPlugin(initializerContext);
};
