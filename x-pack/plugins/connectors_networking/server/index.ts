/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, PluginConfigDescriptor } from '../../../../src/core/server';
import { ConnectorsNetworkingPlugin as Plugin } from './plugin';
import { Config, ConfigSchema } from './config';

export type {
  PluginSetupContract,
  PluginStartContract,
  ConnectorsNetworkingClient,
  ConnectorOptions,
  ConnectorOptionsWithId,
} from './types';

export const config: PluginConfigDescriptor<Config> = {
  schema: ConfigSchema,
};

export const plugin = (context: PluginInitializerContext) => new Plugin(context);
