/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first, map } from 'rxjs/operators';
import {
  IContextProvider,
  KibanaRequest,
  Logger,
  PluginInitializerContext,
  RequestHandler,
} from 'kibana/server';
import { CoreSetup, CoreStart } from 'src/core/server';

import { SecurityPluginSetup } from '../../security/server';
import { PluginSetupContract as ActionsPluginSetup } from '../../actions/server';
import { APP_ID } from '../common/constants';

import { ConfigType } from './config';
import { initCaseApi } from './routes/api';
import {
  caseCommentSavedObjectType,
  caseConfigureSavedObjectType,
  caseConnectorMappingsSavedObjectType,
  caseSavedObjectType,
  caseUserActionSavedObjectType,
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
} from './services';
import { createCaseClient } from './client';
import { registerConnectors } from './connectors';

function createConfig$(context: PluginInitializerContext) {
  return context.config.create<ConfigType>().pipe(map((config) => config));
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

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.log = this.initializerContext.logger.get();
  }

  public async setup(core: CoreSetup, plugins: PluginsSetup) {
    const config = await createConfig$(this.initializerContext).pipe(first()).toPromise();

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

    this.caseService = await new CaseService(this.log).setup({
      authentication: plugins.security != null ? plugins.security.authc : null,
    });
    this.caseConfigureService = await new CaseConfigureService(this.log).setup();
    this.connectorMappingsService = await new ConnectorMappingsService(this.log).setup();
    this.userActionService = await new CaseUserActionService(this.log).setup();

    core.http.registerRouteHandlerContext(
      APP_ID,
      this.createRouteHandlerContext({
        core,
        caseService: this.caseService,
        caseConfigureService: this.caseConfigureService,
        connectorMappingsService: this.connectorMappingsService,
        userActionService: this.userActionService,
      })
    );

    const router = core.http.createRouter();
    initCaseApi({
      caseService: this.caseService,
      caseConfigureService: this.caseConfigureService,
      connectorMappingsService: this.connectorMappingsService,
      userActionService: this.userActionService,
      router,
    });

    registerConnectors({
      actionsRegisterType: plugins.actions.registerType,
      logger: this.log,
      caseService: this.caseService,
      caseConfigureService: this.caseConfigureService,
      connectorMappingsService: this.connectorMappingsService,
      userActionService: this.userActionService,
    });
  }

  public async start(core: CoreStart) {
    this.log.debug(`Starting Case Workflow`);

    const getCaseClientWithRequest = async (request: KibanaRequest) => {
      return createCaseClient({
        savedObjectsClient: core.savedObjects.getScopedClient(request),
        request,
        caseService: this.caseService!,
        caseConfigureService: this.caseConfigureService!,
        connectorMappingsService: this.connectorMappingsService!,
        userActionService: this.userActionService!,
      });
    };

    return {
      getCaseClientWithRequest,
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
  }: {
    core: CoreSetup;
    caseService: CaseServiceSetup;
    caseConfigureService: CaseConfigureServiceSetup;
    connectorMappingsService: ConnectorMappingsServiceSetup;
    userActionService: CaseUserActionServiceSetup;
  }): IContextProvider<RequestHandler<unknown, unknown, unknown>, typeof APP_ID> => {
    return async (context, request) => {
      const [{ savedObjects }] = await core.getStartServices();
      return {
        getCaseClient: () => {
          return createCaseClient({
            savedObjectsClient: savedObjects.getScopedClient(request),
            caseService,
            caseConfigureService,
            connectorMappingsService,
            userActionService,
            request,
          });
        },
      };
    };
  };
}
