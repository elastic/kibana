/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from 'kibana/server';
import { usageProvider } from '../../../../src/plugins/data/server';
import { ENHANCED_ES_SEARCH_STRATEGY, EQL_SEARCH_STRATEGY } from '../common';
import { registerSessionRoutes } from './routes';
import { searchSessionSavedObjectType } from './saved_objects';
import {
  SearchSessionService,
  enhancedEsSearchStrategyProvider,
  eqlSearchStrategyProvider,
} from './search';
import { getUiSettings } from './ui_settings';
import type {
  DataEnhancedRequestHandlerContext,
  DataEnhancedSetupDependencies as SetupDependencies,
  DataEnhancedStartDependencies as StartDependencies,
} from './type';
import { ConfigSchema } from '../config';
import { registerUsageCollector } from './collectors';

export class EnhancedDataServerPlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies> {
  private readonly logger: Logger;
  private sessionService!: SearchSessionService;
  private config: ConfigSchema;

  constructor(private initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.logger = initializerContext.logger.get('data_enhanced');
    this.config = this.initializerContext.config.get<ConfigSchema>();
  }

  public setup(core: CoreSetup<StartDependencies>, deps: SetupDependencies) {
    const usage = deps.usageCollection ? usageProvider(core) : undefined;

    core.uiSettings.register(getUiSettings());
    core.savedObjects.registerType(searchSessionSavedObjectType);

    deps.data.search.registerSearchStrategy(
      ENHANCED_ES_SEARCH_STRATEGY,
      enhancedEsSearchStrategyProvider(
        this.config,
        this.initializerContext.config.legacy.globalConfig$,
        this.logger,
        usage
      )
    );

    deps.data.search.registerSearchStrategy(
      EQL_SEARCH_STRATEGY,
      eqlSearchStrategyProvider(this.logger)
    );

    this.sessionService = new SearchSessionService(this.logger, this.config, deps.security);

    deps.data.__enhance({
      search: {
        defaultStrategy: ENHANCED_ES_SEARCH_STRATEGY,
        sessionService: this.sessionService,
      },
    });

    const router = core.http.createRouter<DataEnhancedRequestHandlerContext>();
    registerSessionRoutes(router, this.logger);

    this.sessionService.setup(core, {
      taskManager: deps.taskManager,
    });

    if (deps.usageCollection) {
      registerUsageCollector(deps.usageCollection, this.initializerContext, this.logger);
    }
  }

  public start(core: CoreStart, { taskManager }: StartDependencies) {
    this.sessionService.start(core, {
      taskManager,
    });
  }

  public stop() {
    this.sessionService.stop();
  }
}

export { EnhancedDataServerPlugin as Plugin };
