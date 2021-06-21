/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IContextProvider, KibanaRequest, Logger, PluginInitializerContext } from 'kibana/server';
import { CoreSetup, CoreStart } from 'src/core/server';

import { SecurityPluginSetup, SecurityPluginStart } from '../../security/server';
import {
  PluginSetupContract as ActionsPluginSetup,
  PluginStartContract as ActionsPluginStart,
} from '../../actions/server';
import { APP_ID, ENABLE_CASE_CONNECTOR } from '../common';

import { ConfigType } from './config';
import { initCaseApi } from './routes/api';
import {
  caseCommentSavedObjectType,
  caseConfigureSavedObjectType,
  caseConnectorMappingsSavedObjectType,
  caseSavedObjectType,
  caseUserActionSavedObjectType,
  subCaseSavedObjectType,
} from './saved_object_types';

import { CasesClient } from './client';
import { registerConnectors } from './connectors';
import type { CasesRequestHandlerContext } from './types';
import { CasesClientFactory } from './client/factory';
import { SpacesPluginStart } from '../../spaces/server';
import { PluginStartContract as FeaturesPluginStart } from '../../features/server';

function createConfig(context: PluginInitializerContext) {
  return context.config.get<ConfigType>();
}

export interface PluginsSetup {
  security?: SecurityPluginSetup;
  actions: ActionsPluginSetup;
}

export interface PluginsStart {
  security?: SecurityPluginStart;
  features: FeaturesPluginStart;
  spaces?: SpacesPluginStart;
  actions: ActionsPluginStart;
}

/**
 * Cases server exposed contract for interacting with cases entities.
 */
export interface PluginStartContract {
  /**
   * Returns a client which can be used to interact with the cases backend entities.
   *
   * @param request a KibanaRequest
   * @returns a {@link CasesClient}
   */
  getCasesClientWithRequest(request: KibanaRequest): Promise<CasesClient>;
}

export class CasePlugin {
  private readonly log: Logger;
  private clientFactory: CasesClientFactory;
  private securityPluginSetup?: SecurityPluginSetup;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.log = this.initializerContext.logger.get();
    this.clientFactory = new CasesClientFactory(this.log);
  }

  public async setup(core: CoreSetup, plugins: PluginsSetup) {
    const config = createConfig(this.initializerContext);

    if (!config.enabled) {
      return;
    }

    this.securityPluginSetup = plugins.security;

    core.savedObjects.registerType(caseCommentSavedObjectType);
    core.savedObjects.registerType(caseConfigureSavedObjectType);
    core.savedObjects.registerType(caseConnectorMappingsSavedObjectType);
    core.savedObjects.registerType(caseSavedObjectType);
    core.savedObjects.registerType(caseUserActionSavedObjectType);

    this.log.debug(
      `Setting up Case Workflow with core contract [${Object.keys(
        core
      )}] and plugins [${Object.keys(plugins)}]`
    );

    core.http.registerRouteHandlerContext<CasesRequestHandlerContext, 'cases'>(
      APP_ID,
      this.createRouteHandlerContext({
        core,
      })
    );

    const router = core.http.createRouter<CasesRequestHandlerContext>();
    initCaseApi({
      logger: this.log,
      router,
    });

    if (ENABLE_CASE_CONNECTOR) {
      core.savedObjects.registerType(subCaseSavedObjectType);
      registerConnectors({
        registerActionType: plugins.actions.registerType,
        logger: this.log,
        factory: this.clientFactory,
      });
    }
  }

  public start(core: CoreStart, plugins: PluginsStart): PluginStartContract {
    this.log.debug(`Starting Case Workflow`);

    this.clientFactory.initialize({
      securityPluginSetup: this.securityPluginSetup,
      securityPluginStart: plugins.security,
      getSpace: async (request: KibanaRequest) => {
        return plugins.spaces?.spacesService.getActiveSpace(request);
      },
      featuresPluginStart: plugins.features,
      actionsPluginStart: plugins.actions,
    });

    const client = core.elasticsearch.client;

    const getCasesClientWithRequest = async (request: KibanaRequest): Promise<CasesClient> => {
      return this.clientFactory.create({
        request,
        scopedClusterClient: client.asScoped(request).asCurrentUser,
        savedObjectsService: core.savedObjects,
      });
    };

    return {
      getCasesClientWithRequest,
    };
  }

  public stop() {
    this.log.debug(`Stopping Case Workflow`);
  }

  private createRouteHandlerContext = ({
    core,
  }: {
    core: CoreSetup;
  }): IContextProvider<CasesRequestHandlerContext, 'cases'> => {
    return async (context, request, response) => {
      return {
        getCasesClient: async () => {
          const [{ savedObjects }] = await core.getStartServices();

          return this.clientFactory.create({
            request,
            scopedClusterClient: context.core.elasticsearch.client.asCurrentUser,
            savedObjectsService: savedObjects,
          });
        },
      };
    };
  };
}
