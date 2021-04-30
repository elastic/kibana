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
import { APP_ID, ENABLE_CASE_CONNECTOR } from '../common/constants';

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
  CaseService,
  CaseUserActionService,
  ConnectorMappingsService,
  AlertService,
} from './services';
import { CasesClient } from './client';
import { registerConnectors } from './connectors';
import type { CasesRequestHandlerContext } from './types';
import { CasesClientFactory } from './client/factory';
import { SpacesPluginStart } from '../../spaces/server';
import { PluginStartContract as FeaturesPluginStart } from '../../features/server';
import { AttachmentService } from './services/attachments';

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

export class CasePlugin {
  private readonly log: Logger;
  private caseConfigureService?: CaseConfigureService;
  private caseService?: CaseService;
  private connectorMappingsService?: ConnectorMappingsService;
  private userActionService?: CaseUserActionService;
  private alertsService?: AlertService;
  private attachmentService?: AttachmentService;
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

    this.caseService = new CaseService(
      this.log,
      plugins.security != null ? plugins.security.authc : undefined
    );
    this.caseConfigureService = new CaseConfigureService(this.log);
    this.connectorMappingsService = new ConnectorMappingsService(this.log);
    this.userActionService = new CaseUserActionService(this.log);
    this.alertsService = new AlertService();
    this.attachmentService = new AttachmentService(this.log);

    core.http.registerRouteHandlerContext<CasesRequestHandlerContext, 'cases'>(
      APP_ID,
      this.createRouteHandlerContext({
        core,
      })
    );

    const router = core.http.createRouter<CasesRequestHandlerContext>();
    initCaseApi({
      logger: this.log,
      caseService: this.caseService,
      caseConfigureService: this.caseConfigureService,
      connectorMappingsService: this.connectorMappingsService,
      userActionService: this.userActionService,
      attachmentService: this.attachmentService,
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

  public start(core: CoreStart, plugins: PluginsStart) {
    this.log.debug(`Starting Case Workflow`);

    this.clientFactory.initialize({
      alertsService: this.alertsService!,
      caseConfigureService: this.caseConfigureService!,
      caseService: this.caseService!,
      connectorMappingsService: this.connectorMappingsService!,
      userActionService: this.userActionService!,
      attachmentService: this.attachmentService!,
      securityPluginSetup: this.securityPluginSetup,
      securityPluginStart: plugins.security,
      getSpace: async (request: KibanaRequest) => {
        return plugins.spaces?.spacesService.getActiveSpace(request);
      },
      featuresPluginStart: plugins.features,
      actionsPluginStart: plugins.actions,
    });

    const getCasesClientWithRequestAndContext = async (
      context: CasesRequestHandlerContext,
      request: KibanaRequest
    ): Promise<CasesClient> => {
      return this.clientFactory.create({
        request,
        scopedClusterClient: context.core.elasticsearch.client.asCurrentUser,
        savedObjectsService: core.savedObjects,
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
  }: {
    core: CoreSetup;
  }): IContextProvider<CasesRequestHandlerContext, 'cases'> => {
    return async (context, request, response) => {
      const [{ savedObjects }] = await core.getStartServices();
      return {
        getCasesClient: async () => {
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
