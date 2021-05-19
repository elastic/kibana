/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  Logger,
  KibanaRequest,
  CoreStart,
  IContextProvider,
} from 'src/core/server';
import { SecurityPluginSetup } from '../../security/server';
import { RuleDataPluginService } from './rule_data_plugin_service';
import { RuleRegistryPluginConfig } from '.';
import { AlertsClientFactory } from './alert_data_client/alert_client_factory';
import { PluginStartContract as AlertingStart } from '../../alerting/server';
import { SpacesPluginStart } from '../../spaces/server';
import { RacApiRequestHandlerContext, RacRequestHandlerContext } from './types';
import { defineRoutes } from './routes';
export type RuleRegistryPluginSetupContract = RuleDataPluginService;
export type RuleRegistryPluginStartContract = void;

export interface RuleRegistryPluginsSetup {
  security?: SecurityPluginSetup;
}

export interface RuleRegistryPluginsStart {
  alerting: AlertingStart;
  spaces?: SpacesPluginStart;
}

export class RuleRegistryPlugin implements Plugin<RuleRegistryPluginSetupContract> {
  private readonly logger: Logger;
  private readonly config: RuleRegistryPluginConfig;
  private readonly alertsClientFactory: AlertsClientFactory;
  private security: SecurityPluginSetup | undefined;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
    this.config = initContext.config.get<RuleRegistryPluginConfig>();
    this.alertsClientFactory = new AlertsClientFactory();
  }

  public setup(
    core: CoreSetup,
    plugins: RuleRegistryPluginsSetup
  ): RuleRegistryPluginSetupContract {
    this.security = plugins.security;

    const service = new RuleDataPluginService({
      logger: this.logger,
      isWriteEnabled: this.config.write.enabled,
      index: this.config.index,
      getClusterClient: async () => {
        const [coreStart] = await core.getStartServices();

        return coreStart.elasticsearch.client.asInternalUser;
      },
    });

    service.init().catch((originalError) => {
      const error = new Error('Failed installing assets');
      // @ts-ignore
      error.stack = originalError.stack;
      this.logger.error(error);
    });

    // ALERTS ROUTES
    const router = core.http.createRouter<RacRequestHandlerContext>();
    core.http.registerRouteHandlerContext<RacRequestHandlerContext, 'rac'>(
      'rac',
      this.createRouteHandlerContext()
    );

    defineRoutes(router);

    return service;
  }

  public start(core: CoreStart, plugins: RuleRegistryPluginsStart) {
    const { logger, alertsClientFactory, security } = this;

    alertsClientFactory.initialize({
      logger,
      getSpaceId(request: KibanaRequest) {
        return plugins.spaces?.spacesService.getSpaceId(request);
      },
      esClient: core.elasticsearch.client.asInternalUser,
      // NOTE: Alerts share the authorization client with the alerting plugin
      getAlertingAuthorization(request: KibanaRequest) {
        return plugins.alerting.getAlertingAuthorizationWithRequest(request);
      },
      securityPluginSetup: security,
    });

    const getRacClientWithRequest = (request: KibanaRequest) => {
      return alertsClientFactory.create(request);
    };

    return {
      getRacClientWithRequest,
      alerting: plugins.alerting,
    };
  }

  private createRouteHandlerContext = (): IContextProvider<RacRequestHandlerContext, 'rac'> => {
    const { alertsClientFactory } = this;
    return async function alertsRouteHandlerContext(
      context,
      request
    ): Promise<RacApiRequestHandlerContext> {
      return {
        getAlertsClient: async () => {
          const createdClient = alertsClientFactory.create(request);
          return createdClient;
        },
      };
    };
  };

  public stop() {}
}
