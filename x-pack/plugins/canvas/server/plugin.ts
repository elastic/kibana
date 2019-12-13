/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import { CoreSetup, PluginInitializerContext, Plugin, Logger } from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { initRoutes } from './routes';
import { registerCanvasUsageCollector } from './collectors';

interface PluginsSetup {
  usageCollection?: UsageCollectionSetup;
}

export class CanvasPlugin implements Plugin {
  private readonly logger: Logger;
  constructor(public readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public async setup(coreSetup: CoreSetup, plugins: PluginsSetup) {
    const canvasRouter = coreSetup.http.createRouter();

    initRoutes({ router: canvasRouter, logger: this.logger });

    const globalConfig = await this.initializerContext.config.legacy.globalConfig$
      .pipe(first())
      .toPromise();
    registerCanvasUsageCollector(plugins.usageCollection, globalConfig.kibana.index);
  }

  public start() {}

  public stop() {}
}
