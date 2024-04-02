/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  DEFAULT_APP_CATEGORIES,
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
import type { KibanaRequest } from '@kbn/core-http-server';
import { firstValueFrom } from 'rxjs';
import { OBSERVABILITY_AI_ASSISTANT_FEATURE_ID } from '../common/feature';
import type { ObservabilityAIAssistantConfig } from './config';
import { registerServerRoutes } from './routes/register_routes';
import { ObservabilityAIAssistantRouteHandlerResources } from './routes/types';
import { ObservabilityAIAssistantService } from './service';
import {
  ObservabilityAIAssistantPluginSetup,
  ObservabilityAIAssistantPluginStart,
  ObservabilityAIAssistantPluginSetupDependencies,
  ObservabilityAIAssistantPluginStartDependencies,
} from './types';
import { addLensDocsToKb } from './service/knowledge_base_service/kb_docs/lens';
import { registerFunctions } from './functions';
import { getConnectorType as getObsAIAssistantConnectorType } from './rule_connector';
import { RespondFunctionResources } from './service/types';

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
  service: ObservabilityAIAssistantService | undefined;

  constructor(context: PluginInitializerContext<ObservabilityAIAssistantConfig>) {
    this.logger = context.logger.get();
  }
  public setup(
    core: CoreSetup<
      ObservabilityAIAssistantPluginStartDependencies,
      ObservabilityAIAssistantPluginStart
    >,
    plugins: ObservabilityAIAssistantPluginSetupDependencies
  ): ObservabilityAIAssistantPluginSetup {
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

        // Wait for the license to be available so the ML plugin's guards pass once we ask for ELSER stats
        await firstValueFrom(pluginsStart.licensing.license$);

        const elserModelDefinition = await plugins.ml
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

    plugins.actions.registerType(
      getObsAIAssistantConnectorType({
        getObsAIClient: async (request: KibanaRequest) => {
          const client = await service.getClient({ request });
          const resources = {
            request,
            logger: this.logger.get('connector'),
            context: {
              rac: {
                async getAlertsClient() {
                  const [_, pluginsStart] = await core.getStartServices();
                  return pluginsStart.ruleRegistry.getRacClientWithRequest(request);
                },
              },
            },
            plugins: {
              core,
              actions: {
                async start() {
                  const [_, pluginsStart] = await core.getStartServices();
                  return pluginsStart.actions;
                },
              },
            },
          } as unknown as RespondFunctionResources;
          const functionClient = await service.getFunctionClient({
            client,
            resources,
            signal: new AbortController().signal,
          });
          const actionsClient = await (
            await resources.plugins.actions.start()
          ).getActionsClientWithRequest(request);
          return {
            client,
            functionClient,
            actionsClient,
            kibanaPublicUrl: core.http.basePath.publicBaseUrl,
          };
        },
      })
    );

    registerServerRoutes({
      core,
      logger: this.logger,
      dependencies: {
        plugins: routeHandlerPlugins,
        service: this.service,
      },
    });

    return {
      service,
    };
  }

  public start(): ObservabilityAIAssistantPluginStart {
    return {
      service: this.service!,
    };
  }
}
