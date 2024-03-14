/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/server';
import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server';
import {
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
  CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
} from '@kbn/actions-plugin/server/constants/saved_objects';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { i18n } from '@kbn/i18n';
import { Logger } from '@kbn/logging';
import { mapValues, once } from 'lodash';
import { firstValueFrom } from 'rxjs';
import { OBSERVABILITY_AI_ASSISTANT_FEATURE_ID } from '../../../common/features/ai_assistant/feature';
import {
  ObservabilityPluginSetupDependencies,
  ObservabilityPluginStartDependencies,
} from '../../types';
import { registerFunctions } from './functions';
import { registerServerRoutes } from './routes/register_routes';
import { ObservabilityAIAssistantRouteHandlerResources } from './routes/types';
import { ObservabilityAIAssistantService } from './service';
import { addLensDocsToKb } from './service/knowledge_base_service/kb_docs/lens';

export function setupAIAssistantFeature({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<ObservabilityPluginStartDependencies>;
  plugins: ObservabilityPluginSetupDependencies;
  logger: Logger;
}) {
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
          return pluginsStartContracts[key as keyof ObservabilityPluginStartDependencies];
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
      logger.error(`Failed to resolve ELSER model definition: ${error}`);

      // Fallback to ELSER v2
      return '.elser_model_2';
    }
  });

  const service = new ObservabilityAIAssistantService({
    logger: logger.get('service'),
    core,
    taskManager: plugins.taskManager,
    getModelId,
  });

  service.register(registerFunctions);

  addLensDocsToKb({ service, logger: logger.get('kb').get('lens') });

  registerServerRoutes({
    core,
    logger,
    dependencies: {
      plugins: routeHandlerPlugins,
      service,
    },
  });

  return { service };
}
