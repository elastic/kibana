/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type CoreSetup,
  type Logger,
  Plugin,
  type PluginInitializerContext,
  type CoreStart,
} from '@kbn/core/server';
import type { ObservabilityAIAssistantAppConfig } from './config';
import { registerFunctions } from './functions';
import type {
  ObservabilityAIAssistantAppPluginSetupDependencies,
  ObservabilityAIAssistantAppPluginStartDependencies,
  ObservabilityAIAssistantAppServerSetup,
  ObservabilityAIAssistantAppServerStart,
} from './types';

export class ObservabilityAIAssistantAppPlugin
  implements
    Plugin<
      ObservabilityAIAssistantAppServerSetup,
      ObservabilityAIAssistantAppServerStart,
      ObservabilityAIAssistantAppPluginSetupDependencies,
      ObservabilityAIAssistantAppPluginStartDependencies
    >
{
  logger: Logger;

  constructor(context: PluginInitializerContext<ObservabilityAIAssistantAppConfig>) {
    this.logger = context.logger.get();
  }
  public setup(
    core: CoreSetup<
      ObservabilityAIAssistantAppPluginStartDependencies,
      ObservabilityAIAssistantAppServerStart
    >,
    plugins: ObservabilityAIAssistantAppPluginSetupDependencies
  ): ObservabilityAIAssistantAppServerSetup {
    return {};
  }

  public start(
    core: CoreStart,
    pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies
  ): ObservabilityAIAssistantAppServerStart {
    pluginsStart.observabilityAIAssistant.service.register((params) => {
      return registerFunctions({
        ...params,
        pluginsStart,
      });
    });
    return {};
  }
}
