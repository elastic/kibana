/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize } from 'lodash';

import { Logger, KibanaRequest, RequestHandlerContext } from 'kibana/server';

import { DEFAULT_SPACE_ID } from '../common/constants';
import { AppClientFactory } from './client';
import { ConfigType } from './config';
import { ruleExecutionLogForRoutesFactory } from './lib/detection_engine/rule_execution_log';
import { buildFrameworkRequest } from './lib/timeline/utils/common';
import {
  SecuritySolutionPluginCoreSetupDependencies,
  SecuritySolutionPluginSetupDependencies,
} from './plugin_contract';
import {
  SecuritySolutionApiRequestHandlerContext,
  SecuritySolutionRequestHandlerContext,
} from './types';
import { Immutable } from '../common/endpoint/types';
import { EndpointAuthz } from '../common/endpoint/types/authz';
import {
  calculateEndpointAuthz,
  getEndpointAuthzInitialState,
} from '../common/endpoint/service/authz';
import { licenseService } from './lib/license';
import { FleetAuthz } from '../../fleet/common';

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
    const { config, logger, core, plugins } = options;
    const { lists, ruleRegistry, security } = plugins;

    const [, startPlugins] = await core.getStartServices();
    const frameworkRequest = await buildFrameworkRequest(context, security, request);
    appClientFactory.setup({
      getSpaceId: startPlugins.spaces?.spacesService?.getSpaceId,
      config,
    });

    let endpointAuthz: Immutable<EndpointAuthz>;
    let fleetAuthz: FleetAuthz;

    // If Fleet is enabled, then get its Authz
    if (startPlugins.fleet) {
      fleetAuthz =
        (await context.fleet)?.authz ?? (await startPlugins.fleet?.authz.fromRequest(request));
    }

    const coreContext = await context.core;

    return {
      core: coreContext,

      get endpointAuthz(): Immutable<EndpointAuthz> {
        // Lazy getter of endpoint Authz. No point in defining it if it is never used.
        if (!endpointAuthz) {
          // If no fleet (fleet plugin is optional in the configuration), then just turn off all permissions
          if (!startPlugins.fleet) {
            endpointAuthz = getEndpointAuthzInitialState();
          } else {
            const userRoles = security?.authc.getCurrentUser(request)?.roles ?? [];
            endpointAuthz = calculateEndpointAuthz(licenseService, fleetAuthz, userRoles);
          }
        }

        return endpointAuthz;
      },

      getConfig: () => config,

      getFrameworkRequest: () => frameworkRequest,

      getAppClient: () => appClientFactory.create(request),

      getSpaceId: () => startPlugins.spaces?.spacesService?.getSpaceId(request) || DEFAULT_SPACE_ID,

      getRuleDataService: () => ruleRegistry.ruleDataService,

      getRuleExecutionLog: memoize(() =>
        ruleExecutionLogForRoutesFactory(
          coreContext.savedObjects.client,
          startPlugins.eventLog.getClient(request),
          logger
        )
      ),

      getExceptionListClient: () => {
        if (!lists) {
          return null;
        }

        const username = security?.authc.getCurrentUser(request)?.username || 'elastic';
        return lists.getExceptionListClient(coreContext.savedObjects.client, username);
      },
    };
  }
}
