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
  IRouter,
  KibanaRequest,
} from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { UICapabilities } from 'ui/capabilities';
import { SecurityPluginSetup } from '../../security/server';

import { checkAccess } from './lib/check_access';
import { registerEnginesRoute } from './routes/app_search/engines';
import { registerTelemetryRoute } from './routes/app_search/telemetry';
import { registerTelemetryUsageCollector } from './collectors/app_search/telemetry';
import { appSearchTelemetryType } from './saved_objects/app_search/telemetry';

export interface PluginsSetup {
  usageCollection?: UsageCollectionSetup;
  security?: SecurityPluginSetup;
}

export interface ServerConfigType {
  host?: string;
  enabled: boolean;
  accessCheckTimeout: number;
}

export interface IRouteDependencies {
  router: IRouter;
  config: ServerConfigType;
  log: Logger;
  getSavedObjectsService?(): SavedObjectsServiceStart;
}

export class EnterpriseSearchPlugin implements Plugin {
  private config: Observable<ServerConfigType>;
  private logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.create<ServerConfigType>();
    this.logger = initializerContext.logger.get();
  }

  public async setup(
    { capabilities, http, savedObjects, getStartServices }: CoreSetup,
    { usageCollection, security }: PluginsSetup
  ) {
    const config = await this.config.pipe(first()).toPromise();

    /**
     * Register user access to the Enterprise Search plugins
     */
    capabilities.registerProvider(() => ({
      navLinks: {
        app_search: true,
      },
      catalogue: {
        app_search: true,
      },
    }));

    capabilities.registerSwitcher(
      async (request: KibanaRequest, uiCapabilities: UICapabilities) => {
        const dependencies = { config, security, request, log: this.logger };

        const hasAppSearchAccess = await checkAccess({
          enterpriseSearchPath: 'as',
          ...dependencies,
        });
        // TODO: hasWorkplaceSearchAccess

        return {
          ...uiCapabilities,
          navLinks: {
            ...uiCapabilities.navLinks,
            app_search: hasAppSearchAccess,
          },
          catalogue: {
            ...uiCapabilities.catalogue,
            app_search: hasAppSearchAccess,
          },
        };
      }
    );

    /**
     * Register routes
     */
    const router = http.createRouter();
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
