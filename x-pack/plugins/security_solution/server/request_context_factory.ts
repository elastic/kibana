/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize } from 'lodash';

import type { Logger, KibanaRequest, RequestHandlerContext } from '@kbn/core/server';

import { DEFAULT_SPACE_ID } from '../common/constants';
import { AppClientFactory } from './client';
import type { ConfigType } from './config';
import type { IRuleMonitoringService } from './lib/detection_engine/rule_monitoring';
import { buildFrameworkRequest } from './lib/timeline/utils/common';
import type {
  SecuritySolutionPluginCoreSetupDependencies,
  SecuritySolutionPluginSetupDependencies,
} from './plugin_contract';
import type {
  SecuritySolutionApiRequestHandlerContext,
  SecuritySolutionRequestHandlerContext,
} from './types';
import type { Immutable } from '../common/endpoint/types';
import type { EndpointAuthz } from '../common/endpoint/types/authz';
import type { EndpointAppContextService } from './endpoint/endpoint_app_context_services';
import { RiskEngineDataClient } from './lib/entity_analytics/risk_engine/risk_engine_data_client';
import { RiskScoreDataClient } from './lib/entity_analytics/risk_score/risk_score_data_client';
import { AssetCriticalityDataClient } from './lib/entity_analytics/asset_criticality';

export interface IRequestContextFactory {
  create(
    context: RequestHandlerContext,
    request: KibanaRequest
  ): Promise<SecuritySolutionApiRequestHandlerContext>;
}

interface ConstructorOptions {
  config: ConfigType;
  logger: Logger;
  core: SecuritySolutionPluginCoreSetupDependencies;
  plugins: SecuritySolutionPluginSetupDependencies;
  endpointAppContextService: EndpointAppContextService;
  ruleMonitoringService: IRuleMonitoringService;
  kibanaVersion: string;
  kibanaBranch: string;
}

export class RequestContextFactory implements IRequestContextFactory {
  private readonly appClientFactory: AppClientFactory;

  constructor(private readonly options: ConstructorOptions) {
    this.appClientFactory = new AppClientFactory();
  }

  public async create(
    context: Omit<SecuritySolutionRequestHandlerContext, 'securitySolution'>,
    request: KibanaRequest
  ): Promise<SecuritySolutionApiRequestHandlerContext> {
    const { options, appClientFactory } = this;
    const { config, core, plugins, endpointAppContextService, ruleMonitoringService } = options;

    const { lists, ruleRegistry, security } = plugins;

    const [, startPlugins] = await core.getStartServices();
    const frameworkRequest = await buildFrameworkRequest(context, security, request);
    const coreContext = await context.core;

    const getSpaceId = (): string =>
      startPlugins.spaces?.spacesService?.getSpaceId(request) || DEFAULT_SPACE_ID;

    appClientFactory.setup({
      getSpaceId: startPlugins.spaces?.spacesService?.getSpaceId,
      config,
      kibanaVersion: options.kibanaVersion,
      kibanaBranch: options.kibanaBranch,
    });

    // List of endpoint authz for the current request's user. Will be initialized the first
    // time it is requested (see `getEndpointAuthz()` below)
    let endpointAuthz: Immutable<EndpointAuthz>;

    return {
      core: coreContext,

      getServerBasePath: () => core.http.basePath.serverBasePath,

      getEndpointAuthz: async (): Promise<Immutable<EndpointAuthz>> => {
        if (!endpointAuthz) {
          // eslint-disable-next-line require-atomic-updates
          endpointAuthz = await endpointAppContextService.getEndpointAuthz(request);
        }

        return endpointAuthz;
      },

      getConfig: () => config,

      getFrameworkRequest: () => frameworkRequest,

      getAppClient: () => appClientFactory.create(request),

      getSpaceId,

      getRuleDataService: () => ruleRegistry.ruleDataService,

      getRacClient: startPlugins.ruleRegistry.getRacClientWithRequest,

      getDetectionEngineHealthClient: memoize(() =>
        ruleMonitoringService.createDetectionEngineHealthClient({
          rulesClient: startPlugins.alerting.getRulesClientWithRequest(request),
          eventLogClient: startPlugins.eventLog.getClient(request),
          currentSpaceId: getSpaceId(),
        })
      ),

      getRuleExecutionLog: memoize(() =>
        ruleMonitoringService.createRuleExecutionLogClientForRoutes({
          savedObjectsClient: coreContext.savedObjects.client,
          eventLogClient: startPlugins.eventLog.getClient(request),
        })
      ),

      getExceptionListClient: () => {
        if (!lists) {
          return null;
        }

        const username = security?.authc.getCurrentUser(request)?.username || 'elastic';
        return lists.getExceptionListClient(coreContext.savedObjects.client, username);
      },

      getInternalFleetServices: memoize(() => endpointAppContextService.getInternalFleetServices()),

      getRiskEngineDataClient: memoize(
        () =>
          new RiskEngineDataClient({
            logger: options.logger,
            kibanaVersion: options.kibanaVersion,
            esClient: coreContext.elasticsearch.client.asCurrentUser,
            soClient: coreContext.savedObjects.client,
            namespace: getSpaceId(),
          })
      ),
      getRiskScoreDataClient: memoize(
        () =>
          new RiskScoreDataClient({
            logger: options.logger,
            kibanaVersion: options.kibanaVersion,
            esClient: coreContext.elasticsearch.client.asCurrentUser,
            soClient: coreContext.savedObjects.client,
            namespace: getSpaceId(),
          })
      ),
      getAssetCriticalityDataClient: memoize(
        () =>
          new AssetCriticalityDataClient({
            logger: options.logger,
            esClient: coreContext.elasticsearch.client.asCurrentUser,
            namespace: getSpaceId(),
          })
      ),
    };
  }
}
