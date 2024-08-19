/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';

import { InferencePlugin } from './plugin';
import type {
  InferencePublicSetup,
  InferencePublicStart,
  InferenceSetupDependencies,
  InferenceStartDependencies,
  ConfigSchema,
} from './types';

export { httpResponseIntoObservable } from './util/http_response_into_observable';

export type { InferencePublicSetup, InferencePublicStart };

export const plugin: PluginInitializer<
  InferencePublicSetup,
  InferencePublicStart,
  InferenceSetupDependencies,
  InferenceStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) =>
  new InferencePlugin(pluginInitializerContext);
