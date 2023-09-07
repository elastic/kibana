/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { mapValues } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
} from '@kbn/actions-plugin/server/constants/saved_objects';
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
import { addLensDocsToKb } from './service/kb_service/kb_docs/lens';

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

    const service = new ObservabilityAIAssistantService({
      logger: this.logger.get('service'),
      core,
      taskManager: plugins.taskManager,
    });

    addLensDocsToKb(service);

    registerServerRoutes({
      core,
      logger: this.logger,
      dependencies: {
        plugins: routeHandlerPlugins,
        service,
      },
    });

    return {};
  }

  public start(
    core: CoreStart,
    plugins: ObservabilityAIAssistantPluginStartDependencies
  ): ObservabilityAIAssistantPluginStart {
    return {};
  }
}
