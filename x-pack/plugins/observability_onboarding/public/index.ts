/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ApplicationStart,
  HttpStart,
  PluginInitializer,
  PluginInitializerContext,
} from '@kbn/core/public';
import {
  ObservabilityOnboardingPlugin,
  ObservabilityOnboardingPluginSetup,
  ObservabilityOnboardingPluginStart,
} from './plugin';

export interface ConfigSchema {
  ui: {
    enabled: boolean;
  };
  serverless: {
    enabled: boolean;
  };
}

export interface ObservabilityOnboardingAppServices {
  application: ApplicationStart;
  http: HttpStart;
  config: ConfigSchema;
}

export const plugin: PluginInitializer<
  ObservabilityOnboardingPluginSetup,
  ObservabilityOnboardingPluginStart
> = (ctx: PluginInitializerContext<ConfigSchema>) =>
  new ObservabilityOnboardingPlugin(ctx);

export type {
  ObservabilityOnboardingPluginSetup,
  ObservabilityOnboardingPluginStart,
};
