/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, Plugin, CoreSetup, Logger } from '@kbn/core/server';
import { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import { ObservabilityAIAssistantPluginStart } from '@kbn/observability-ai-assistant-plugin/server/types';
import type { FakeRawRequest } from '@kbn/core-http-server';
import { CoreKibanaRequest } from '@kbn/core-http-router-server-internal';
import { registerConnectorTypes } from './connector_types';
import { validSlackApiChannelsRoute, getWellKnownEmailServiceRoute } from './routes';
import {
  ExperimentalFeatures,
  parseExperimentalConfigValue,
} from '../common/experimental_features';
import { StackConnectorsConfigType } from '../common/types';

export interface ConnectorsPluginsSetup {
  actions: ActionsPluginSetupContract;
}

export interface ConnectorsPluginsStart {
  actions: ActionsPluginSetupContract;
}

export class StackConnectorsPlugin implements Plugin<void, void> {
  private readonly logger: Logger;
  private config: StackConnectorsConfigType;
  readonly experimentalFeatures: ExperimentalFeatures;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.config = context.config.get();
    this.experimentalFeatures = parseExperimentalConfigValue(this.config.enableExperimental || []);
  }

  public setup(core: CoreSetup<ConnectorsPluginsStart>, plugins: ConnectorsPluginsSetup) {
    const router = core.http.createRouter();
    const { actions } = plugins;

    getWellKnownEmailServiceRoute(router);
    validSlackApiChannelsRoute(router, actions.getActionsConfigurationUtilities(), this.logger);

    registerConnectorTypes({
      actions,
      publicBaseUrl: core.http.basePath.publicBaseUrl,
      experimentalFeatures: this.experimentalFeatures,
      getObsAIClient: () => {
        return core.plugins
          .onStart<{ observabilityAIAssistant: ObservabilityAIAssistantPluginStart }>(
            'observabilityAIAssistant'
          )
          .then(async ({ observabilityAIAssistant }) => {
            if (observabilityAIAssistant.found) {
              const fakeRawRequest: FakeRawRequest = {
                headers: {
                  authorization:
                    'ApiKey R2Q4dm5ZMEJnbzRmclpmV0l0LWo6R215QkJhV1RSVzYzM1ZxWG9QS2h4dw==',
                },
                path: '/',
              };

              const fakeRequest = CoreKibanaRequest.from(fakeRawRequest);

              return observabilityAIAssistant.contract.service.getClient({
                request: fakeRequest,
              });
            }
          });
      },
    });
  }

  public start() {}
  public stop() {}
}
