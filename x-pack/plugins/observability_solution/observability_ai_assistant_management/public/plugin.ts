/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, Plugin } from '@kbn/core/public';
import { ManagementSetup } from '@kbn/management-plugin/public';
import { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { ServerlessPluginStart } from '@kbn/serverless/public';
import { EnterpriseSearchPublicStart } from '@kbn/enterprise-search-plugin/public';

import type {
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
} from '@kbn/observability-ai-assistant-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AiAssistantManagementObservabilityPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AiAssistantManagementObservabilityPluginStart {}

export interface SetupDependencies {
  management: ManagementSetup;
  home?: HomePublicPluginSetup;
  observabilityAIAssistant: ObservabilityAIAssistantPublicSetup;
}

export interface StartDependencies {
  observabilityAIAssistant: ObservabilityAIAssistantPublicStart;
  serverless?: ServerlessPluginStart;
  enterpriseSearch?: EnterpriseSearchPublicStart;
}

export class AiAssistantManagementObservabilityPlugin
  implements
    Plugin<
      AiAssistantManagementObservabilityPluginSetup,
      AiAssistantManagementObservabilityPluginStart,
      SetupDependencies,
      StartDependencies
    >
{
  public setup(
    core: CoreSetup<StartDependencies, AiAssistantManagementObservabilityPluginStart>,
    { home, management, observabilityAIAssistant }: SetupDependencies
  ): AiAssistantManagementObservabilityPluginSetup {
    const title = i18n.translate('xpack.observabilityAiAssistantManagement.app.title', {
      defaultMessage: 'AI Assistant for Observability',
    });

    if (home) {
      home.featureCatalogue.register({
        id: 'ai_assistant_observability',
        title,
        description: i18n.translate('xpack.observabilityAiAssistantManagement.app.description', {
          defaultMessage: 'Manage your AI Assistant for Observability.',
        }),
        icon: 'sparkles',
        path: '/app/management/kibana/ai-assistant/observability',
        showOnHomePage: false,
        category: 'admin',
      });
    }

    if (observabilityAIAssistant) {
      management.sections.section.kibana.registerApp({
        id: 'observabilityAiAssistantManagement',
        title,
        hideFromSidebar: true,
        order: 1,
        mount: async (mountParams) => {
          const { mountManagementSection } = await import('./app');

          return mountManagementSection({
            core,
            mountParams,
          });
        },
      });
    }

    return {};
  }

  public start() {
    return {};
  }
}
