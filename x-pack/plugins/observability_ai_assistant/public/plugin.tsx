/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import {
  AppNavLinkStatus,
  DEFAULT_APP_CATEGORIES,
  type AppMountParameters,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/logging';
import { createService } from './service/create_service';
import { useGenAIConnectorsWithoutContext } from './hooks/use_genai_connectors';
import type {
  ConfigSchema,
  ObservabilityAIAssistantPluginSetup,
  ObservabilityAIAssistantPluginSetupDependencies,
  ObservabilityAIAssistantPluginStart,
  ObservabilityAIAssistantPluginStartDependencies,
  ObservabilityAIAssistantService,
} from './types';
import { registerTelemetryEventTypes } from './analytics';

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
          path: '/conversations/new',
        },
      ],
      mount: async (appMountParameters: AppMountParameters<unknown>) => {
        // Load application bundle and Get start services
        const [{ Application }, [coreStart, pluginsStart]] = await Promise.all([
          import('./application'),
          coreSetup.getStartServices(),
        ]);

        ReactDOM.render(
          <Application
            {...appMountParameters}
            service={this.service!}
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

    registerTelemetryEventTypes(coreSetup.analytics);

    return {};
  }

  start(
    coreStart: CoreStart,
    pluginsStart: ObservabilityAIAssistantPluginStartDependencies
  ): ObservabilityAIAssistantPluginStart {
    const service = (this.service = createService({
      analytics: coreStart.analytics,
      coreStart,
      enabled: coreStart.application.capabilities.observabilityAIAssistant.show === true,
      licenseStart: pluginsStart.licensing,
      securityStart: pluginsStart.security,
      shareStart: pluginsStart.share,
    }));

    service.register(async ({ registerRenderFunction }) => {
      const mod = await import('./functions');

      return mod.registerFunctions({
        service,
        pluginsStart,
        registerRenderFunction,
      });
    });

    return {
      service,
      useGenAIConnectors: () => useGenAIConnectorsWithoutContext(service),
    };
  }
}
