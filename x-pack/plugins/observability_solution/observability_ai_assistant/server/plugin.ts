/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  DEFAULT_APP_CATEGORIES,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { mapValues, once } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
} from '@kbn/actions-plugin/server/constants/saved_objects';
import { firstValueFrom } from 'rxjs';
import { OBSERVABILITY_AI_ASSISTANT_FEATURE_ID } from '../common/feature';
import type { ObservabilityAIAssistantConfig } from './config';
import { registerServerRoutes } from './routes/register_routes';
import {
  ObservabilityAIAssistantRequestHandlerContext,
  ObservabilityAIAssistantRouteHandlerResources,
} from './routes/types';
import { ObservabilityAIAssistantService } from './service';
import {
  ObservabilityAIAssistantServerSetup,
  ObservabilityAIAssistantServerStart,
  ObservabilityAIAssistantPluginSetupDependencies,
  ObservabilityAIAssistantPluginStartDependencies,
} from './types';
import { addLensDocsToKb } from './service/knowledge_base_service/kb_docs/lens';
import { registerFunctions } from './functions';
import { recallRankingEvent } from './analytics/recall_ranking';
import {
  getObsAIAssistantConnectorType,
  getObsAIAssistantConnectorAdapter,
} from './rule_connector';

export class ObservabilityAIAssistantPlugin
  implements
    Plugin<
      ObservabilityAIAssistantServerSetup,
      ObservabilityAIAssistantServerStart,
      ObservabilityAIAssistantPluginSetupDependencies,
      ObservabilityAIAssistantPluginStartDependencies
    >
{
  logger: Logger;
  service: ObservabilityAIAssistantService | undefined;

  constructor(context: PluginInitializerContext<ObservabilityAIAssistantConfig>) {
    this.logger = context.logger.get();
  }
  public setup(
    core: CoreSetup<
      ObservabilityAIAssistantPluginStartDependencies,
      ObservabilityAIAssistantServerStart
    >,
    plugins: ObservabilityAIAssistantPluginSetupDependencies
  ): ObservabilityAIAssistantServerSetup {
    plugins.features.registerKibanaFeature({
      id: OBSERVABILITY_AI_ASSISTANT_FEATURE_ID,
      name: i18n.translate('xpack.observabilityAiAssistant.featureRegistry.featureName', {
        defaultMessage: 'Observability AI Assistant',
      }),
      order: 8600,
      category: DEFAULT_APP_CATEGORIES.observability,
      app: [OBSERVABILITY_AI_ASSISTANT_FEATURE_ID, 'kibana'],
      catalogue: [OBSERVABILITY_AI_ASSISTANT_FEATURE_ID],
      minimumLicense: 'enterprise',
      // see x-pack/plugins/features/common/feature_kibana_privileges.ts
      privileges: {
        all: {
          app: [OBSERVABILITY_AI_ASSISTANT_FEATURE_ID, 'kibana'],
          api: [OBSERVABILITY_AI_ASSISTANT_FEATURE_ID, 'ai_assistant'],
          catalogue: [OBSERVABILITY_AI_ASSISTANT_FEATURE_ID],
          savedObject: {
            all: [
              ACTION_SAVED_OBJECT_TYPE,
              ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
              CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
            ],
            read: [],
          },
          ui: ['show'],
        },
        read: {
          disabled: true,
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    });

    const routeHandlerPlugins = mapValues(plugins, (value, key) => {
      return {
        setup: value,
        start: () =>
          core.getStartServices().then((services) => {
            const [, pluginsStartContracts] = services;
            return pluginsStartContracts[
              key as keyof ObservabilityAIAssistantPluginStartDependencies
            ];
          }),
      };
    }) as ObservabilityAIAssistantRouteHandlerResources['plugins'];

    const getModelId = once(async () => {
      // Using once to make sure the same model ID is used during service init and Knowledge base setup

      try {
        // Wait for the ML plugin's dependency on the internal saved objects client to be ready
        const [_, pluginsStart] = await core.getStartServices();

        const { ml } = await core.plugins.onSetup('ml');

        if (!ml.found) {
          throw new Error('Could not find ML plugin');
        }

        // Wait for the license to be available so the ML plugin's guards pass once we ask for ELSER stats
        await firstValueFrom(pluginsStart.licensing.license$);

        const elserModelDefinition = await (
          ml.contract as {
            trainedModelsProvider: (
              request: {},
              soClient: {}
            ) => { getELSER: () => Promise<{ model_id: string }> };
          }
        )
          .trainedModelsProvider({} as any, {} as any) // request, savedObjectsClient (but we fake it to use the internal user)
          .getELSER();

        return elserModelDefinition.model_id;
      } catch (error) {
        this.logger.error(`Failed to resolve ELSER model definition: ${error}`);

        // Fallback to ELSER v2
        return '.elser_model_2';
      }
    });

    const service = (this.service = new ObservabilityAIAssistantService({
      logger: this.logger.get('service'),
      core,
      taskManager: plugins.taskManager,
      getModelId,
    }));

    service.register(registerFunctions);

    addLensDocsToKb({ service, logger: this.logger.get('kb').get('lens') });

    const initResources = async (
      request: KibanaRequest
    ): Promise<ObservabilityAIAssistantRouteHandlerResources> => {
      const [coreStart, pluginsStart] = await core.getStartServices();
      const license = await firstValueFrom(pluginsStart.licensing.license$);
      const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
      return {
        request,
        service,
        context: {
          rac: routeHandlerPlugins.ruleRegistry.start().then((startContract) => {
            return {
              getAlertsClient() {
                return startContract.getRacClientWithRequest(request);
              },
            };
          }),
          core: {
            elasticsearch: {
              client: coreStart.elasticsearch.client.asScoped(request),
            },
            uiSettings: {
              client: coreStart.uiSettings.asScopedToClient(savedObjectsClient),
            },
            savedObjects: {
              client: savedObjectsClient,
            },
          },
          licensing: { license },
        } as unknown as ObservabilityAIAssistantRequestHandlerContext,
        logger: this.logger.get('connector'),
        plugins: routeHandlerPlugins,
      };
    };

    plugins.actions.registerType(getObsAIAssistantConnectorType(initResources));
    plugins.alerting.registerConnectorAdapter(getObsAIAssistantConnectorAdapter());

    registerServerRoutes({
      core,
      logger: this.logger,
      dependencies: {
        plugins: routeHandlerPlugins,
        service: this.service,
      },
    });

    core.analytics.registerEventType(recallRankingEvent);

    return {
      service,
    };
  }

  public start(): ObservabilityAIAssistantServerStart {
    return {
      service: this.service!,
    };
  }
}
