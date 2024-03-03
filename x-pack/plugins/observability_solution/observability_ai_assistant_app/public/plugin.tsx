/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import {
  ObservabilityAIAssistantAppPluginSetupDependencies,
  ObservabilityAIAssistantAppPluginStartDependencies,
  ObservabilityAIAssistantAppPublicSetup,
  ObservabilityAIAssistantAppPublicStart,
} from './types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ConfigSchema {}

export class ObservabilityAIAssistantAppPlugin
  implements
    Plugin<
      ObservabilityAIAssistantAppPublicSetup,
      ObservabilityAIAssistantAppPublicStart,
      ObservabilityAIAssistantAppPluginSetupDependencies,
      ObservabilityAIAssistantAppPluginStartDependencies
    >
{
  logger: Logger;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup,
    pluginsSetup: ObservabilityAIAssistantAppPluginSetupDependencies
  ): ObservabilityAIAssistantAppPublicSetup {
    return {};
  }

  start(
    coreStart: CoreStart,
    pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies
  ): ObservabilityAIAssistantAppPublicStart {
    pluginsStart.observabilityAIAssistant.register(async ({ registerRenderFunction }) => {
      const { registerFunctions } = await import('./functions');

      await registerFunctions({ pluginsStart, registerRenderFunction });
    });

    return {};
  }
}
