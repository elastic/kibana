/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IContextProvider, KibanaRequest, Logger, PluginInitializerContext } from 'kibana/server';
import { CoreSetup, CoreStart } from 'src/core/server';

import { SecurityPluginSetup } from '../../security/server';
import { PluginSetupContract as ActionsPluginSetup } from '../../actions/server';
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
import {
  CaseConfigureService,
  CaseConfigureServiceSetup,
  CaseService,
  CaseServiceSetup,
  CaseUserActionService,
  CaseUserActionServiceSetup,
  ConnectorMappingsService,
  ConnectorMappingsServiceSetup,
  AlertService,
  AlertServiceContract,
} from './services';
import { CasesClientHandler, createExternalCasesClient } from './client';
import { registerConnectors } from './connectors';
import type { CasesRequestHandlerContext } from './types';

function createConfig(context: PluginInitializerContext) {
  return context.config.get<ConfigType>();
}

export interface PluginsSetup {
  security: SecurityPluginSetup;
  actions: ActionsPluginSetup;
}

export class CasePlugin {
  private readonly log: Logger;
  private caseConfigureService?: CaseConfigureServiceSetup;
  private caseService?: CaseServiceSetup;
  private connectorMappingsService?: ConnectorMappingsServiceSetup;
  private userActionService?: CaseUserActionServiceSetup;
  private alertsService?: AlertService;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.log = this.initializerContext.logger.get();
  }

  public async setup(core: CoreSetup, plugins: PluginsSetup) {
    const config = createConfig(this.initializerContext);

    if (!config.enabled) {
      return;
    }

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

    this.caseService = new CaseService(
      this.log,
      plugins.security != null ? plugins.security.authc : undefined
    );
    this.caseConfigureService = await new CaseConfigureService(this.log).setup();
    this.connectorMappingsService = await new ConnectorMappingsService(this.log).setup();
    this.userActionService = await new CaseUserActionService(this.log).setup();
    this.alertsService = new AlertService();

    core.http.registerRouteHandlerContext<CasesRequestHandlerContext, 'cases'>(
      APP_ID,
      this.createRouteHandlerContext({
        core,
        caseService: this.caseService,
        caseConfigureService: this.caseConfigureService,
        connectorMappingsService: this.connectorMappingsService,
        userActionService: this.userActionService,
        alertsService: this.alertsService,
        logger: this.log,
      })
    );

    const router = core.http.createRouter<CasesRequestHandlerContext>();
    initCaseApi({
      logger: this.log,
      caseService: this.caseService,
      caseConfigureService: this.caseConfigureService,
      connectorMappingsService: this.connectorMappingsService,
      userActionService: this.userActionService,
      router,
    });

    if (ENABLE_CASE_CONNECTOR) {
      core.savedObjects.registerType(subCaseSavedObjectType);
      registerConnectors({
        actionsRegisterType: plugins.actions.registerType,
        logger: this.log,
        caseService: this.caseService,
        caseConfigureService: this.caseConfigureService,
        connectorMappingsService: this.connectorMappingsService,
        userActionService: this.userActionService,
        alertsService: this.alertsService,
      });
    }
  }

  public start(core: CoreStart) {
    this.log.debug(`Starting Case Workflow`);

    const getCasesClientWithRequestAndContext = async (
      context: CasesRequestHandlerContext,
      request: KibanaRequest
    ) => {
      const user = await this.caseService!.getUser({ request });
      return createExternalCasesClient({
        scopedClusterClient: context.core.elasticsearch.client.asCurrentUser,
        savedObjectsClient: core.savedObjects.getScopedClient(request),
        user,
        caseService: this.caseService!,
        caseConfigureService: this.caseConfigureService!,
        connectorMappingsService: this.connectorMappingsService!,
        userActionService: this.userActionService!,
        alertsService: this.alertsService!,
        logger: this.log,
      });
    };

    return {
      getCasesClientWithRequestAndContext,
    };
  }

  public stop() {
    this.log.debug(`Stopping Case Workflow`);
  }

  private createRouteHandlerContext = ({
    core,
    caseService,
    caseConfigureService,
    connectorMappingsService,
    userActionService,
    alertsService,
    logger,
  }: {
    core: CoreSetup;
    caseService: CaseServiceSetup;
    caseConfigureService: CaseConfigureServiceSetup;
    connectorMappingsService: ConnectorMappingsServiceSetup;
    userActionService: CaseUserActionServiceSetup;
    alertsService: AlertServiceContract;
    logger: Logger;
  }): IContextProvider<CasesRequestHandlerContext, 'cases'> => {
    return async (context, request, response) => {
      const [{ savedObjects }] = await core.getStartServices();
      const user = await caseService.getUser({ request });
      return {
        getCasesClient: () => {
          return new CasesClientHandler({
            scopedClusterClient: context.core.elasticsearch.client.asCurrentUser,
            savedObjectsClient: savedObjects.getScopedClient(request),
            caseService,
            caseConfigureService,
            connectorMappingsService,
            userActionService,
            alertsService,
            user,
            logger,
          });
        },
      };
    };
  };
}
