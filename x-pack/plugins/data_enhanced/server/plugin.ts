/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../../src/core/server';
import { ES_SEARCH_STRATEGY } from '../../../../src/plugins/data/common';
import { PluginSetup as DataPluginSetup } from '../../../../src/plugins/data/server';
import { enhancedEsSearchStrategyProvider, updateExpirationProvider } from './search';
import {
  SessionService,
  backgroundSession,
  registerBackgroundSessionGetRoute,
  registerBackgroundSessionSaveRoute,
} from './session';
import { SecurityPluginSetup } from '../../security/server';

interface SetupDependencies {
  data: DataPluginSetup;
  security: SecurityPluginSetup;
}

export interface DataEnhancedStart {
  backgroundSession: SessionService;
}

export class EnhancedDataServerPlugin
  implements Plugin<void, DataEnhancedStart, SetupDependencies> {
  private readonly logger: Logger;
  private sessionService!: SessionService;
  private security?: SecurityPluginSetup;

  constructor(private initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('enhanced-data');
  }

  public setup(core: CoreSetup, deps: SetupDependencies) {
    deps.data.search.registerSearchStrategy(
      ES_SEARCH_STRATEGY,
      enhancedEsSearchStrategyProvider(this.initializerContext.config.legacy.globalConfig$)
    );

    // Background session registrations
    this.security = deps.security;
    core.savedObjects.registerType(backgroundSession);
    core.http.registerRouteHandlerContext<'backgroundSession'>('backgroundSession', () => {
      return this.sessionService;
    });
    const router = core.http.createRouter();
    registerBackgroundSessionGetRoute(router);
    registerBackgroundSessionSaveRoute(router);
  }

  public start(core: CoreStart) {
    const internalApiCaller = core.elasticsearch.legacy.client.callAsInternalUser;
    const updateExpirationHandler = updateExpirationProvider(internalApiCaller);
    this.sessionService = new SessionService(
      core.savedObjects,
      this.security!,
      updateExpirationHandler,
      this.logger
    );

    return {
      backgroundSession: this.sessionService,
    };
  }

  public stop() {}
}

export { EnhancedDataServerPlugin as Plugin };
