/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../../src/core/server';

import { createConfig$ } from './create_config';
import { OsqueryPluginSetup, OsqueryPluginStart, SetupPlugins, StartPlugins } from './types';
import { defineRoutes } from './routes';
import { osquerySearchStrategyProvider } from './search_strategy/osquery';

export class OsqueryPlugin implements Plugin<OsqueryPluginSetup, OsqueryPluginStart> {
  private readonly logger: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public async setup(core: CoreSetup<StartPlugins, OsqueryPluginStart>, plugins: SetupPlugins) {
    this.logger.debug('osquery: Setup');
    const config = await createConfig$(this.initializerContext).pipe(first()).toPromise();

    if (!config.enabled) {
      return {};
    }

    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    core.getStartServices().then(([_, depsStart]) => {
      const osquerySearchStrategy = osquerySearchStrategyProvider(depsStart.data);

      plugins.data.search.registerSearchStrategy('osquerySearchStrategy', osquerySearchStrategy);
    });

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('osquery: Started');
    return {};
  }

  public stop() {}
}
