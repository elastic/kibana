/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { Logger } from '@kbn/logging';
import { withSuspense } from '@kbn/shared-ux-utility';
import React, { type ComponentType, lazy, type Ref } from 'react';
import { i18n } from '@kbn/i18n';
import { registerTelemetryEventTypes } from './analytics';
import { ObservabilityAIAssistantChatServiceContext } from './context/observability_ai_assistant_chat_service_context';
import { ObservabilityAIAssistantMultipaneFlyoutContext } from './context/observability_ai_assistant_multipane_flyout_context';
import { ObservabilityAIAssistantProvider } from './context/observability_ai_assistant_provider';
import { createUseChat } from './hooks/use_chat';
import { useGenAIConnectorsWithoutContext } from './hooks/use_genai_connectors';
import { useObservabilityAIAssistantChatService } from './hooks/use_observability_ai_assistant_chat_service';
import { createService } from './service/create_service';
import type {
  ConfigSchema,
  ObservabilityAIAssistantPluginSetupDependencies,
  ObservabilityAIAssistantPluginStartDependencies,
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
  ObservabilityAIAssistantService,
} from './types';
import { useUserPreferredLanguage } from './hooks/use_user_preferred_language';
import { getContextualInsightMessages } from './utils/get_contextual_insight_messages';
import { createScreenContextAction } from './utils/create_screen_context_action';

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
  clearScreenContext?: () => void;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup,
    pluginsSetup: ObservabilityAIAssistantPluginSetupDependencies
  ): ObservabilityAIAssistantPublicSetup {
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

    this.clearScreenContext = service.setScreenContext({
      starterPrompts: [
        {
          title: i18n.translate(
            'xpack.observabilityAiAssistant.starterPrompts.doIHaveAlerts.title',
            { defaultMessage: 'Alerts' }
          ),
          prompt: i18n.translate(
            'xpack.observabilityAiAssistant.starterPrompts.doIHaveAlerts.prompt',
            {
              defaultMessage: 'Do I have any alerts?',
            }
          ),
          icon: 'bell',
        },
        {
          title: i18n.translate(
            'xpack.observabilityAiAssistant.starterPrompts.howCanICreateANewRule.title',
            {
              defaultMessage: 'Rule creation',
            }
          ),
          prompt: i18n.translate(
            'xpack.observabilityAiAssistant.starterPrompts.howCanICreateANewRule.prompt',
            {
              defaultMessage: 'How can I create a new rule?',
            }
          ),
          icon: 'createSingleMetricJob',
        },
        {
          title: i18n.translate(
            'xpack.observabilityAiAssistant.starterPrompts.whatAreCases.title',
            {
              defaultMessage: 'Cases',
            }
          ),
          prompt: i18n.translate(
            'xpack.observabilityAiAssistant.starterPrompts.whatAreCases.prompt',
            {
              defaultMessage: 'What are cases?',
            }
          ),
          icon: 'casesApp',
        },
        {
          title: i18n.translate('xpack.observabilityAiAssistant.starterPrompts.whatAreSlos.title', {
            defaultMessage: 'SLOs',
          }),
          prompt: i18n.translate(
            'xpack.observabilityAiAssistant.starterPrompts.whatAreSlos.prompt',
            {
              defaultMessage: 'What are SLOs?',
            }
          ),
          icon: 'bullseye',
        },
      ],
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
      useChat: createUseChat({
        notifications: coreStart.notifications,
      }),
      useUserPreferredLanguage,
      ObservabilityAIAssistantMultipaneFlyoutContext,
      ObservabilityAIAssistantChatServiceContext,
      useObservabilityAIAssistantChatService,
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
      getContextualInsightMessages,
      createScreenContextAction,
    };
  }

  stop() {
    this.clearScreenContext?.();
  }
}
