/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  type AppMountParameters,
  AppNavLinkStatus,
  type CoreSetup,
  DEFAULT_APP_CATEGORIES,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/logging';
import React from 'react';
import ReactDOM from 'react-dom';
import { createService } from './service/create_service';
import type {
  ConfigSchema,
  ObservabilityAIAssistantPluginSetup,
  ObservabilityAIAssistantPluginSetupDependencies,
  ObservabilityAIAssistantPluginStart,
  ObservabilityAIAssistantPluginStartDependencies,
  ObservabilityAIAssistantService,
} from './types';

export class ObservabilityAIAssistantPlugin
  implements
    Plugin<
      ObservabilityAIAssistantPluginSetup,
      ObservabilityAIAssistantPluginStart,
      ObservabilityAIAssistantPluginSetupDependencies,
      ObservabilityAIAssistantPluginStartDependencies
    >
{
  logger: Logger;
  service?: ObservabilityAIAssistantService;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup,
    pluginsSetup: ObservabilityAIAssistantPluginSetupDependencies
  ): ObservabilityAIAssistantPluginSetup {
    this.service = createService(coreSetup);

    coreSetup.application.register({
      id: 'observabilityAIAssistant',
      title: i18n.translate('xpack.observabilityAiAssistant.appTitle', {
        defaultMessage: 'Observability AI Assistant',
      }),
      euiIconType: 'logoObservability',
      appRoute: '/app/observabilityAIAssistant',
      category: DEFAULT_APP_CATEGORIES.observability,
      navLinkStatus: AppNavLinkStatus.hidden,
      deepLinks: [
        {
          id: 'conversations',
          title: i18n.translate('xpack.observabilityAiAssistant.conversationsDeepLinkTitle', {
            defaultMessage: 'Conversations',
          }),
          path: '/conversations',
        },
      ],

      async mount(appMountParameters: AppMountParameters<unknown>) {
        // Load application bundle and Get start services
        const [{ Application }, [coreStart, pluginsStart]] = await Promise.all([
          import('./application'),
          coreSetup.getStartServices(),
        ]);

        ReactDOM.render(
          <Application
            {...appMountParameters}
            coreStart={coreStart}
            pluginsStart={pluginsStart as ObservabilityAIAssistantPluginStartDependencies}
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

  start(): ObservabilityAIAssistantPluginStart {
    return this.service!;
  }
}
