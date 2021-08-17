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
  SharedGlobalConfig,
} from 'src/core/server';

import { PluginStartContract as AlertingStart } from '../../alerting/server';
import { SecurityPluginSetup } from '../../security/server';

import { INDEX_PREFIX, RuleRegistryPluginConfig } from './config';
import { RuleDataPluginService } from './rule_data_plugin_service';
import { AlertsClientFactory } from './alert_data_client/alerts_client_factory';
import { AlertsClient } from './alert_data_client/alerts_client';
import { RacApiRequestHandlerContext, RacRequestHandlerContext } from './types';
import { defineRoutes } from './routes';

export interface RuleRegistryPluginSetupDependencies {
  security?: SecurityPluginSetup;
}

export interface RuleRegistryPluginStartDependencies {
  alerting: AlertingStart;
}

export interface RuleRegistryPluginSetupContract {
  ruleDataService: RuleDataPluginService;
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
    > {
  private readonly config: RuleRegistryPluginConfig;
  private readonly legacyConfig: SharedGlobalConfig;
  private readonly logger: Logger;
  private readonly alertsClientFactory: AlertsClientFactory;
  private ruleDataService: RuleDataPluginService | null;
  private security: SecurityPluginSetup | undefined;

  constructor(initContext: PluginInitializerContext) {
    this.config = initContext.config.get<RuleRegistryPluginConfig>();
    // TODO: Can be removed in 8.0.0. Exists to work around multi-tenancy users.
    this.legacyConfig = initContext.config.legacy.get();
    this.logger = initContext.logger.get();
    this.ruleDataService = null;
    this.alertsClientFactory = new AlertsClientFactory();
  }

  public setup(
    core: CoreSetup<RuleRegistryPluginStartDependencies, RuleRegistryPluginStartContract>,
    plugins: RuleRegistryPluginSetupDependencies
  ): RuleRegistryPluginSetupContract {
    const { logger } = this;

    const startDependencies = core.getStartServices().then(([coreStart, pluginStart]) => {
      return {
        core: coreStart,
        ...pluginStart,
      };
    });

    this.security = plugins.security;

    const isWriteEnabled = (config: RuleRegistryPluginConfig, legacyConfig: SharedGlobalConfig) => {
      const hasEnabledWrite = config.write.enabled;
      const hasSetCustomKibanaIndex = legacyConfig.kibana.index !== '.kibana';
      const hasSetUnsafeAccess = config.unsafe.legacyMultiTenancy.enabled;

      if (!hasEnabledWrite) return false;

      // Not using legacy multi-tenancy
      if (!hasSetCustomKibanaIndex) {
        return hasEnabledWrite;
      } else {
        return hasSetUnsafeAccess;
      }
    };

    this.ruleDataService = new RuleDataPluginService({
      logger,
      isWriteEnabled: isWriteEnabled(this.config, this.legacyConfig),
      index: INDEX_PREFIX,
      getClusterClient: async () => {
        const deps = await startDependencies;
        return deps.core.elasticsearch.client.asInternalUser;
      },
    });

    this.ruleDataService.initializeService();

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
    const { logger, alertsClientFactory, security } = this;

    alertsClientFactory.initialize({
      logger,
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
