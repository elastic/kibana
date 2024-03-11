/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ComponentType, lazy, Ref } from 'react';
import ReactDOM from 'react-dom';
import {
  DEFAULT_APP_CATEGORIES,
  type AppMountParameters,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/logging';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { withSuspense } from '@kbn/shared-ux-utility';
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
import { ObservabilityAIAssistantProvider } from './context/observability_ai_assistant_provider';
import { useUserPreferredLanguage } from './hooks/use_user_preferred_language';

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
      useUserPreferredLanguage,
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
