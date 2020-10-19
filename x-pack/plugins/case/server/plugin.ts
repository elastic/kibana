/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first, map } from 'rxjs/operators';
import { IContextProvider, Logger, PluginInitializerContext, RequestHandler } from 'kibana/server';
import { CoreSetup } from 'src/core/server';

import { SecurityPluginSetup } from '../../security/server';

import { ConfigType } from './config';
import { initCaseApi } from './routes/api';
import {
  caseSavedObjectType,
  caseConfigureSavedObjectType,
  caseCommentSavedObjectType,
  caseUserActionSavedObjectType,
} from './saved_object_types';
import {
  CaseConfigureService,
  CaseConfigureServiceSetup,
  CaseService,
  CaseServiceSetup,
  CaseUserActionService,
  CaseUserActionServiceSetup,
} from './services';
import { createCaseClient } from './client';

function createConfig$(context: PluginInitializerContext) {
  return context.config.create<ConfigType>().pipe(map((config) => config));
}

export interface PluginsSetup {
  security: SecurityPluginSetup;
}

export class CasePlugin {
  private readonly log: Logger;
  private caseService: CaseService;
  private caseConfigureService: CaseConfigureService;
  private userActionService: CaseUserActionService;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.log = this.initializerContext.logger.get();
    this.caseService = new CaseService(this.log);
    this.caseConfigureService = new CaseConfigureService(this.log);
    this.userActionService = new CaseUserActionService(this.log);
  }

  public async setup(core: CoreSetup, plugins: PluginsSetup) {
    const config = await createConfig$(this.initializerContext).pipe(first()).toPromise();

    if (!config.enabled) {
      return;
    }

    core.savedObjects.registerType(caseSavedObjectType);
    core.savedObjects.registerType(caseCommentSavedObjectType);
    core.savedObjects.registerType(caseConfigureSavedObjectType);
    core.savedObjects.registerType(caseUserActionSavedObjectType);

    this.log.debug(
      `Setting up Case Workflow with core contract [${Object.keys(
        core
      )}] and plugins [${Object.keys(plugins)}]`
    );

    const caseService = await this.caseService.setup({
      authentication: plugins.security != null ? plugins.security.authc : null,
    });
    const caseConfigureService = await this.caseConfigureService.setup();
    const userActionService = await this.userActionService.setup();

    core.http.registerRouteHandlerContext(
      'case',
      this.createRouteHandlerContext({ caseService, caseConfigureService, userActionService })
    );

    const router = core.http.createRouter();
    initCaseApi({
      caseService,
      caseConfigureService,
      userActionService,
      router,
    });
  }

  public start() {
    this.log.debug(`Starting Case Workflow`);
  }

  public stop() {
    this.log.debug(`Stopping Case Workflow`);
  }

  private createRouteHandlerContext = ({
    caseService,
    caseConfigureService,
    userActionService,
  }: {
    caseService: CaseServiceSetup;
    caseConfigureService: CaseConfigureServiceSetup;
    userActionService: CaseUserActionServiceSetup;
  }): IContextProvider<RequestHandler<unknown, unknown, unknown>, 'case'> => {
    return async (context, request) => {
      return {
        getCaseClient: () => {
          return createCaseClient({
            caseService,
            caseConfigureService,
            userActionService,
          });
        },
      };
    };
  };
}
