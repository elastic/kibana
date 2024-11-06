/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  PluginConfigDescriptor,
  PluginInitializer,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { StreamsAPIConfig } from './config';
import type {
  StreamsAPIServerStart,
  StreamsAPIServerSetup,
  StreamsAPISetupDependencies,
  StreamsAPIStartDependencies,
} from './types';

export type { StreamsAPIServerRouteRepository } from './routes/get_global_streams_api_route_repository';

export type { StreamsAPIServerSetup, StreamsAPIServerStart };

import { config as configSchema } from './config';
import { StreamsAPIPlugin } from './plugin';

export const config: PluginConfigDescriptor<StreamsAPIConfig> = {
  schema: configSchema,
};

export const plugin: PluginInitializer<
  StreamsAPIServerSetup,
  StreamsAPIServerStart,
  StreamsAPISetupDependencies,
  StreamsAPIStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<StreamsAPIConfig>) =>
  new StreamsAPIPlugin(pluginInitializerContext);
