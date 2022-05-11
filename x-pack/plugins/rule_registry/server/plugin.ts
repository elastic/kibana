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
} from '@kbn/core/server';

import { PluginStartContract as AlertingStart } from '@kbn/alerting-plugin/server';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  PluginStart as DataPluginStart,
  PluginSetup as DataPluginSetup,
} from '@kbn/data-plugin/server';

import { RuleRegistryPluginConfig } from './config';
import { IRuleDataService, RuleDataService } from './rule_data_plugin_service';
import { AlertsClientFactory } from './alert_data_client/alerts_client_factory';
import { AlertsClient } from './alert_data_client/alerts_client';
import { RacApiRequestHandlerContext, RacRequestHandlerContext } from './types';
import { defineRoutes } from './routes';
import { ruleRegistrySearchStrategyProvider, RULE_SEARCH_STRATEGY_NAME } from './search_strategy';

export interface RuleRegistryPluginSetupDependencies {
  security?: SecurityPluginSetup;
  data: DataPluginSetup;
}

export interface RuleRegistryPluginStartDependencies {
  alerting: AlertingStart;
  data: DataPluginStart;
  spaces?: SpacesPluginStart;
}

export interface RuleRegistryPluginSetupContract {
  ruleDataService: IRuleDataService;
}

export interface RuleRegistryPluginStartContract {
  getRacClientWithRequest: (req: KibanaRequest) => Promise<AlertsClient>;
  alerting: AlertingStart;
}

export class RuleRegistryPlugin
  implements
    Plugin<
      RuleRegistryPluginSetupContract,
      RuleRegistryPluginStartContract,
      RuleRegistryPluginSetupDependencies,
      RuleRegistryPluginStartDependencies
    >
{
  private readonly config: RuleRegistryPluginConfig;
  private readonly logger: Logger;
  private readonly kibanaVersion: string;
  private readonly alertsClientFactory: AlertsClientFactory;
  private ruleDataService: IRuleDataService | null;
  private security: SecurityPluginSetup | undefined;

  constructor(initContext: PluginInitializerContext) {
    this.config = initContext.config.get<RuleRegistryPluginConfig>();
    this.logger = initContext.logger.get();
    this.kibanaVersion = initContext.env.packageInfo.version;
    this.ruleDataService = null;
    this.alertsClientFactory = new AlertsClientFactory();
  }

  public setup(
    core: CoreSetup<RuleRegistryPluginStartDependencies, RuleRegistryPluginStartContract>,
    plugins: RuleRegistryPluginSetupDependencies
  ): RuleRegistryPluginSetupContract {
    const { logger, kibanaVersion } = this;

    const startDependencies = core.getStartServices().then(([coreStart, pluginStart]) => {
      return {
        core: coreStart,
        ...pluginStart,
      };
    });

    this.security = plugins.security;

    this.ruleDataService = new RuleDataService({
      logger,
      kibanaVersion,
      disabledRegistrationContexts: this.config.write.disabledRegistrationContexts,
      isWriteEnabled: this.config.write.enabled,
      isWriterCacheEnabled: this.config.write.cache.enabled,
      getClusterClient: async () => {
        const deps = await startDependencies;
        return deps.core.elasticsearch.client.asInternalUser;
      },
    });

    this.ruleDataService.initializeService();

    core.getStartServices().then(([_, depsStart]) => {
      const ruleRegistrySearchStrategy = ruleRegistrySearchStrategyProvider(
        depsStart.data,
        this.ruleDataService!,
        depsStart.alerting,
        logger,
        plugins.security,
        depsStart.spaces
      );

      plugins.data.search.registerSearchStrategy(
        RULE_SEARCH_STRATEGY_NAME,
        ruleRegistrySearchStrategy
      );
    });

    // ALERTS ROUTES
    const router = core.http.createRouter<RacRequestHandlerContext>();
    core.http.registerRouteHandlerContext<RacRequestHandlerContext, 'rac'>(
      'rac',
      this.createRouteHandlerContext()
    );

    defineRoutes(router);

    return { ruleDataService: this.ruleDataService };
  }

  public start(
    core: CoreStart,
    plugins: RuleRegistryPluginStartDependencies
  ): RuleRegistryPluginStartContract {
    const { logger, alertsClientFactory, ruleDataService, security } = this;

    alertsClientFactory.initialize({
      logger,
      esClient: core.elasticsearch.client.asInternalUser,
      // NOTE: Alerts share the authorization client with the alerting plugin
      getAlertingAuthorization(request: KibanaRequest) {
        return plugins.alerting.getAlertingAuthorizationWithRequest(request);
      },
      securityPluginSetup: security,
      ruleDataService,
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
    return function alertsRouteHandlerContext(context, request): RacApiRequestHandlerContext {
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
