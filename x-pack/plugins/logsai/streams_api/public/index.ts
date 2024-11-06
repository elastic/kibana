/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';

import { StreamsAPIPlugin } from './plugin';
import type {
  StreamsAPIPublicSetup,
  StreamsAPIPublicStart,
  StreamsAPISetupDependencies,
  StreamsAPIStartDependencies,
  ConfigSchema,
} from './types';

export type { StreamsAPIPublicSetup, StreamsAPIPublicStart };

export const plugin: PluginInitializer<
  StreamsAPIPublicSetup,
  StreamsAPIPublicStart,
  StreamsAPISetupDependencies,
  StreamsAPIStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) =>
  new StreamsAPIPlugin(pluginInitializerContext);
