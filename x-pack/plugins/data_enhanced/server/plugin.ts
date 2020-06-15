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
  BackgroundSessionService,
  backgroundSession,
  registerBackgroundSessionGetRoute,
  registerBackgroundSessionSaveRoute,
  registerBackgroundSessionsTask,
  scheduleBackgroundSessionsTasks,
} from './background_session';
import { SecurityPluginSetup } from '../../security/server';
import { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';

interface SetupDependencies {
  data: DataPluginSetup;
  security: SecurityPluginSetup;
  taskManager: TaskManagerSetupContract;
}

interface StartDependencies {
  taskManager: TaskManagerStartContract;
}

export interface DataEnhancedStart {
  backgroundSession: BackgroundSessionService;
}

export class EnhancedDataServerPlugin
  implements Plugin<void, DataEnhancedStart, SetupDependencies> {
  private readonly logger: Logger;
  private backgroundSessionService!: BackgroundSessionService;
  private security?: SecurityPluginSetup;

  constructor(private initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('enhanced-data');
  }

  public setup(core: CoreSetup, deps: SetupDependencies) {
    deps.data.search.registerSearchStrategyContext(
      this.initializerContext.opaqueId,
      'backgroundSearchService',
      () => this.backgroundSessionService
    );
    deps.data.search.registerSearchStrategyProvider(
      this.initializerContext.opaqueId,
      ES_SEARCH_STRATEGY,
      enhancedEsSearchStrategyProvider
    );

    // Background session registrations
    this.security = deps.security;
    core.savedObjects.registerType(backgroundSession);
    core.http.registerRouteHandlerContext<'backgroundSession'>('backgroundSession', () => {
      return this.backgroundSessionService;
    });
    const router = core.http.createRouter();
    registerBackgroundSessionGetRoute(router);
    registerBackgroundSessionSaveRoute(router);

    registerBackgroundSessionsTask(core, deps.taskManager, this.logger);
  }

  public start(core: CoreStart, { taskManager }: StartDependencies) {
    const internalApiCaller = core.elasticsearch.legacy.client.callAsInternalUser;
    const updateExpirationHandler = updateExpirationProvider(internalApiCaller);
    this.backgroundSessionService = new BackgroundSessionService(
      core.savedObjects,
      this.security!,
      updateExpirationHandler,
      this.logger
    );

    scheduleBackgroundSessionsTasks(taskManager, this.logger);

    return {
      backgroundSession: this.backgroundSessionService,
    };
  }

  public stop() {}
}

export { EnhancedDataServerPlugin as Plugin };
