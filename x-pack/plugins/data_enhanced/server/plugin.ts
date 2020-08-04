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
import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
  usageProvider,
} from '../../../../src/plugins/data/server';
import { enhancedEsSearchStrategyProvider } from './search';
import {
  SessionService,
  sessionMapping,
  registerBackgroundSessionGetRoute,
  registerBackgroundSessionSaveRoute,
} from './search';
import { SecurityPluginSetup } from '../../security/server';

import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';

interface SetupDependencies {
  data: DataPluginSetup;
  security: SecurityPluginSetup;
}

export interface DataEnhancedStart {
  search: {
    session: SessionService;
  };
}

interface SetupDependencies {
  data: DataPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

export class EnhancedDataServerPlugin
  implements Plugin<void, DataEnhancedStart, SetupDependencies> {
  private readonly logger: Logger;
  private sessionService!: SessionService;
  private security?: SecurityPluginSetup;

  constructor(private initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('data_enhanced');
  }

  public setup(core: CoreSetup<DataPluginStart, DataEnhancedStart>, deps: SetupDependencies) {
    const usage = deps.usageCollection ? usageProvider(core) : undefined;

    core.getStartServices().then(([, , selfStart]) => {
      deps.data.search.registerSearchStrategy(
        ES_SEARCH_STRATEGY,
        enhancedEsSearchStrategyProvider(
          this.initializerContext.config.legacy.globalConfig$,
          selfStart.search.session,
          this.logger,
          usage
        )
      );
    });

    // Background session registrations
    this.security = deps.security;
    core.savedObjects.registerType(sessionMapping);
    const router = core.http.createRouter();
    registerBackgroundSessionGetRoute(router);
    registerBackgroundSessionSaveRoute(router);

    core.http.registerRouteHandlerContext('sessionService', () => {
      return this.sessionService;
    });
  }

  public start(core: CoreStart) {
    this.sessionService = new SessionService(
      core.savedObjects,
      core.elasticsearch,
      this.security!,
      this.logger
    );

    return {
      search: {
        session: this.sessionService,
      },
    };
  }

  public stop() {}
}

export { EnhancedDataServerPlugin as Plugin };
