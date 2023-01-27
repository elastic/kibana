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
import type { IRuleExecutionLogService } from './lib/detection_engine/rule_monitoring';
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
  ruleExecutionLogService: IRuleExecutionLogService;
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
    const { config, core, plugins, endpointAppContextService, ruleExecutionLogService } = options;
    const { lists, ruleRegistry, security, licensing, osquery } = plugins;

    const [, startPlugins] = await core.getStartServices();
    const frameworkRequest = await buildFrameworkRequest(context, security, request);
    const coreContext = await context.core;

    appClientFactory.setup({
      getSpaceId: startPlugins.spaces?.spacesService?.getSpaceId,
      config,
    });

    // List of endpoint authz for the current request's user. Will be initialized the first
    // time it is requested (see `getEndpointAuthz()` below)
    let endpointAuthz: Immutable<EndpointAuthz>;

    return {
      core: coreContext,

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

      getSpaceId: () => startPlugins.spaces?.spacesService?.getSpaceId(request) || DEFAULT_SPACE_ID,

      getRuleDataService: () => ruleRegistry.ruleDataService,

      getRacClient: startPlugins.ruleRegistry.getRacClientWithRequest,

      getRuleExecutionLog: memoize(() =>
        ruleExecutionLogService.createClientForRoutes({
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

      getQueryRuleAdditionalOptions: {
        licensing,
        osqueryCreateAction: osquery.osqueryCreateAction,
      },
    };
  }
}
