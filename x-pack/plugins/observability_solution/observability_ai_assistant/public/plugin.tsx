/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppMountParameters,
  DEFAULT_APP_CATEGORIES,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { Logger } from '@kbn/logging';
import { withSuspense } from '@kbn/shared-ux-utility';
import React, { ComponentType, lazy, Ref } from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { registerTelemetryEventTypes } from './analytics';
import { ObservabilityAIAssistantMultipaneFlyoutContext } from './context/observability_ai_assistant_multipane_flyout_provider';
import { ObservabilityAIAssistantProvider } from './context/observability_ai_assistant_provider';
import { useGenAIConnectorsWithoutContext } from './hooks/use_genai_connectors';
import { createService } from './service/create_service';
import type {
  ConfigSchema,
  ObservabilityAIAssistantPluginSetupDependencies,
  ObservabilityAIAssistantPluginStartDependencies,
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
  ObservabilityAIAssistantService,
} from './types';

export class ObservabilityAIAssistantPlugin
  implements
    Plugin<
      ObservabilityAIAssistantPublicSetup,
      ObservabilityAIAssistantPublicStart,
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
  ): ObservabilityAIAssistantPublicSetup {
    coreSetup.application.register({
      id: 'observabilityAIAssistant',
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
            [CoreStart, ObservabilityAIAssistantPluginStartDependencies, unknown]
          >,
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
  ): ObservabilityAIAssistantPublicStart {
    const service = (this.service = createService({
      analytics: coreStart.analytics,
      coreStart,
      enabled: coreStart.application.capabilities.observabilityAIAssistant.show === true,
    }));

    const withProviders = <P extends {}, R = {}>(
      Component: ComponentType<P>,
      services: Omit<CoreStart, 'plugins'> & {
        plugins: { start: ObservabilityAIAssistantPluginStartDependencies };
      }
    ) =>
      React.forwardRef((props: P, ref: Ref<R>) => (
        <KibanaContextProvider services={services}>
          <ObservabilityAIAssistantProvider value={service}>
            <Component {...props} ref={ref} />
          </ObservabilityAIAssistantProvider>
        </KibanaContextProvider>
      ));

    const services = {
      ...coreStart,
      plugins: {
        start: pluginsStart,
      },
    };

    const isEnabled = service.isEnabled();

    return {
      service,
      useGenAIConnectors: () => useGenAIConnectorsWithoutContext(service),
      ObservabilityAIAssistantMultipaneFlyoutContext,
      ObservabilityAIAssistantContextualInsight: isEnabled
        ? withSuspense(
            withProviders(
              lazy(() =>
                import('./components/insight/insight').then((m) => ({ default: m.Insight }))
              ),
              services
            )
          )
        : null,
      ObservabilityAIAssistantActionMenuItem: isEnabled
        ? withSuspense(
            withProviders(
              lazy(() =>
                import('./components/action_menu_item/action_menu_item').then((m) => ({
                  default: m.ObservabilityAIAssistantActionMenuItem,
                }))
              ),
              services
            )
          )
        : null,
    };
  }
}
