/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import {
  type AppMountParameters,
  DEFAULT_APP_CATEGORIES,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { i18n } from '@kbn/i18n';
import { AI_ASSISTANT_APP_ID } from '@kbn/deeplinks-observability';
import { createAppService, AIAssistantAppService } from '@kbn/ai-assistant';
import type {
  ObservabilityAIAssistantAppPluginSetupDependencies,
  ObservabilityAIAssistantAppPluginStartDependencies,
  ObservabilityAIAssistantAppPublicSetup,
  ObservabilityAIAssistantAppPublicStart,
} from './types';
import { getObsAIAssistantConnectorType } from './rule_connector';
import { NavControlInitiator } from './components/nav_control/lazy_nav_control';

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
  appService: AIAssistantAppService | undefined;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup,
    _: ObservabilityAIAssistantAppPluginSetupDependencies
  ): ObservabilityAIAssistantAppPublicSetup {
    coreSetup.application.register({
      id: AI_ASSISTANT_APP_ID,
      title: i18n.translate('xpack.observabilityAiAssistant.appTitle', {
        defaultMessage: 'Observability AI Assistant',
      }),
      euiIconType: 'logoObservability',
      appRoute: '/app/observabilityAIAssistant',
      category: DEFAULT_APP_CATEGORIES.observability,
      visibleIn: [],
      deepLinks: [
        {
          id: 'conversations',
          title: i18n.translate('xpack.observabilityAiAssistant.conversationsDeepLinkTitle', {
            defaultMessage: 'Conversations',
          }),
          path: '/conversations/new',
        },
      ],
      mount: async (appMountParameters: AppMountParameters<unknown>) => {
        // Load application bundle and Get start services
        const [{ Application }, [coreStart, pluginsStart]] = await Promise.all([
          import('./application'),
          coreSetup.getStartServices() as Promise<
            [CoreStart, ObservabilityAIAssistantAppPluginStartDependencies, unknown]
          >,
        ]);

        ReactDOM.render(
          <Application
            {...appMountParameters}
            service={this.appService!}
            coreStart={coreStart}
            pluginsStart={pluginsStart as ObservabilityAIAssistantAppPluginStartDependencies}
          />,
          appMountParameters.element
        );

        return () => {
          ReactDOM.unmountComponentAtNode(appMountParameters.element);
        };
      },
    });

    return {};
  }

  start(
    coreStart: CoreStart,
    pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies
  ): ObservabilityAIAssistantAppPublicStart {
    const appService = (this.appService = createAppService({
      pluginsStart,
    }));
    const isEnabled = appService.isEnabled();
    if (isEnabled) {
      coreStart.chrome.navControls.registerRight({
        mount: (element) => {
          ReactDOM.render(
            <NavControlInitiator
              appService={appService}
              coreStart={coreStart}
              pluginsStart={pluginsStart}
            />,
            element,
            () => {}
          );

          return () => {};
        },
        // right before the user profile
        order: 1001,
      });
    }

    const service = pluginsStart.observabilityAIAssistant.service;

    service.register(async ({ registerRenderFunction }) => {
      const { registerFunctions } = await import('./functions');

      await registerFunctions({ pluginsStart, registerRenderFunction });
    });

    pluginsStart.triggersActionsUi.actionTypeRegistry.register(
      getObsAIAssistantConnectorType(service)
    );
    return {};
  }
}
