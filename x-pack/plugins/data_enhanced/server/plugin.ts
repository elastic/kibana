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
<<<<<<< HEAD
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
=======
import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
  usageProvider,
} from '../../../../src/plugins/data/server';
import { enhancedEsSearchStrategyProvider, eqlSearchStrategyProvider } from './search';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';
import { getUiSettings } from './ui_settings';
import { ENHANCED_ES_SEARCH_STRATEGY, EQL_SEARCH_STRATEGY } from '../common';

interface SetupDependencies {
  data: DataPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export class EnhancedDataServerPlugin implements Plugin<void, void, SetupDependencies> {
  private readonly logger: Logger;

  constructor(private initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('data_enhanced');
  }

  public setup(core: CoreSetup<DataPluginStart>, deps: SetupDependencies) {
    const usage = deps.usageCollection ? usageProvider(core) : undefined;

    core.uiSettings.register(getUiSettings());

    deps.data.search.registerSearchStrategy(
      ENHANCED_ES_SEARCH_STRATEGY,
      enhancedEsSearchStrategyProvider(
        this.initializerContext.config.legacy.globalConfig$,
        this.logger,
        usage
      )
    );

    deps.data.search.registerSearchStrategy(
      EQL_SEARCH_STRATEGY,
      eqlSearchStrategyProvider(this.logger)
    );

    deps.data.__enhance({
      search: {
        defaultStrategy: ENHANCED_ES_SEARCH_STRATEGY,
      },
    });
>>>>>>> 058f28ab235a661cfa4b9168e97dd55026f54146
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
