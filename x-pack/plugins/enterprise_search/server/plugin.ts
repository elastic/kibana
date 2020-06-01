/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import {
  Plugin,
  PluginInitializerContext,
  CoreSetup,
  Logger,
  SavedObjectsServiceStart,
} from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';

import { registerEnginesRoute } from './routes/app_search/engines';
import { registerTelemetryRoute } from './routes/app_search/telemetry';
import { registerTelemetryUsageCollector } from './collectors/app_search/telemetry';
import { appSearchTelemetryType } from './saved_objects/app_search/telemetry';

export interface PluginsSetup {
  usageCollection?: UsageCollectionSetup;
}

export interface ServerConfigType {
  host?: string;
}

export class EnterpriseSearchPlugin implements Plugin {
  private config: Observable<ServerConfigType>;
  private logger: Logger;
  private savedObjects?: SavedObjectsServiceStart;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.create<ServerConfigType>();
    this.logger = initializerContext.logger.get();
  }

  public async setup(
    { http, savedObjects, getStartServices }: CoreSetup,
    { usageCollection }: PluginsSetup
  ) {
    const router = http.createRouter();
    const config = await this.config.pipe(first()).toPromise();
    const dependencies = { router, config, log: this.logger };

    registerEnginesRoute(dependencies);

    /**
     * Bootstrap the routes, saved objects, and collector for telemetry
     */
    savedObjects.registerType(appSearchTelemetryType);

    getStartServices().then(([coreStart]) => {
      const savedObjectsStarted = coreStart.savedObjects as SavedObjectsServiceStart;

      registerTelemetryRoute({
        ...dependencies,
        getSavedObjectsService: () => savedObjectsStarted,
      });
      if (usageCollection) {
        registerTelemetryUsageCollector(usageCollection, savedObjectsStarted);
      }
    });
  }

  public start() {}

  public stop() {}
}
