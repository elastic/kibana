/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type CoreSetup,
  type Logger,
  Plugin,
  type PluginInitializerContext,
  type CoreStart,
  KibanaRequest,
} from '@kbn/core/server';
import {
  ObservabilityAIAssistantRequestHandlerContext,
  ObservabilityAIAssistantRouteHandlerResources,
} from '@kbn/observability-ai-assistant-plugin/server/routes/types';
import { ObservabilityAIAssistantPluginStartDependencies } from '@kbn/observability-ai-assistant-plugin/server/types';
import { mapValues } from 'lodash';
import { firstValueFrom } from 'rxjs';
import type { ObservabilityAIAssistantAppConfig } from './config';
import { registerFunctions } from './functions';
import {
  getObsAIAssistantConnectorAdapter,
  getObsAIAssistantConnectorType,
} from './rule_connector';
import type {
  ObservabilityAIAssistantAppPluginSetupDependencies,
  ObservabilityAIAssistantAppPluginStartDependencies,
  ObservabilityAIAssistantAppServerSetup,
  ObservabilityAIAssistantAppServerStart,
} from './types';

export class ObservabilityAIAssistantAppPlugin
  implements
    Plugin<
      ObservabilityAIAssistantAppServerSetup,
      ObservabilityAIAssistantAppServerStart,
      ObservabilityAIAssistantAppPluginSetupDependencies,
      ObservabilityAIAssistantAppPluginStartDependencies
    >
{
  logger: Logger;

  constructor(context: PluginInitializerContext<ObservabilityAIAssistantAppConfig>) {
    this.logger = context.logger.get();
  }
  public setup(
    core: CoreSetup<
      ObservabilityAIAssistantAppPluginStartDependencies,
      ObservabilityAIAssistantAppServerStart
    >,
    plugins: ObservabilityAIAssistantAppPluginSetupDependencies
  ): ObservabilityAIAssistantAppServerSetup {
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

    const initResources = async (
      request: KibanaRequest
    ): Promise<ObservabilityAIAssistantRouteHandlerResources> => {
      const [coreStart, pluginsStart] = await core.getStartServices();
      const license = await firstValueFrom(pluginsStart.licensing.license$);
      const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);

      const context: ObservabilityAIAssistantRequestHandlerContext = {
        rac: routeHandlerPlugins.ruleRegistry.start().then((startContract) => {
          return {
            getAlertsClient() {
              return startContract.getRacClientWithRequest(request);
            },
          };
        }),
        alerting: routeHandlerPlugins.alerting.start().then((startContract) => {
          return {
            getRulesClient() {
              return startContract.getRulesClientWithRequest(request);
            },
          };
        }),
        core: Promise.resolve({
          coreStart,
          elasticsearch: {
            client: coreStart.elasticsearch.client.asScoped(request),
          },
          uiSettings: {
            client: coreStart.uiSettings.asScopedToClient(savedObjectsClient),
          },
          savedObjects: {
            client: savedObjectsClient,
          },
        }),
        licensing: Promise.resolve({ license, featureUsage: pluginsStart.licensing.featureUsage }),
      };

      return {
        request,
        context,
        service: plugins.observabilityAIAssistant.service,
        logger: this.logger.get('connector'),
        plugins: routeHandlerPlugins,
      };
    };

    plugins.actions.registerType(getObsAIAssistantConnectorType(initResources));
    plugins.alerting.registerConnectorAdapter(getObsAIAssistantConnectorAdapter());

    return {};
  }

  public start(
    core: CoreStart,
    pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies
  ): ObservabilityAIAssistantAppServerStart {
    pluginsStart.observabilityAIAssistant.service.register((params) => {
      return registerFunctions({
        ...params,
        pluginsStart,
      });
    });
    return {};
  }
}
