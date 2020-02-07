/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginConfigDescriptor } from 'kibana/server';
import { PluginInitializerContext } from 'kibana/public';
import { GraphPlugin } from './plugin';
import { configSchema, ConfigSchema } from '../config';

export const plugin = (initializerContext: PluginInitializerContext) =>
  new GraphPlugin(initializerContext);

export { GraphSetup } from './plugin';

export const config: PluginConfigDescriptor<ConfigSchema> = {
  schema: configSchema,
};
