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
import { SecurityPluginSetup } from '../../security/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';

import { ConfigType } from './';
import { checkAccess } from './lib/check_access';
import { registerPublicUrlRoute } from './routes/enterprise_search/public_url';
import { registerEnginesRoute } from './routes/app_search/engines';
import { registerTelemetryRoute as registerASTelemetryRoute } from './routes/app_search/telemetry';
import { registerTelemetryUsageCollector as registerASTelemetryUsageCollector } from './collectors/app_search/telemetry';
import { appSearchTelemetryType } from './saved_objects/app_search/telemetry';

import { registerWSOverviewRoute } from './routes/workplace_search/overview';
import { registerTelemetryRoute as registerWSTelemetryRoute } from './routes/workplace_search/telemetry';
import { registerTelemetryUsageCollector as registerWSTelemetryUsageCollector } from './collectors/workplace_search/telemetry';
import { workplaceSearchTelemetryType } from './saved_objects/workplace_search/telemetry';

export interface PluginsSetup {
  usageCollection?: UsageCollectionSetup;
  security?: SecurityPluginSetup;
  features: FeaturesPluginSetup;
}

export interface IRouteDependencies {
  router: IRouter;
  config: ConfigType;
  log: Logger;
  getSavedObjectsService?(): SavedObjectsServiceStart;
}

export class EnterpriseSearchPlugin implements Plugin {
  private config: Observable<ConfigType>;
  private logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.create<ConfigType>();
    this.logger = initializerContext.logger.get();
  }

  public async setup(
    { capabilities, http, savedObjects, getStartServices }: CoreSetup,
    { usageCollection, security, features }: PluginsSetup
  ) {
    const config = await this.config.pipe(first()).toPromise();

    /**
     * Register space/feature control
     */
    features.registerFeature({
      id: 'enterpriseSearch',
      name: 'Enterprise Search',
      order: 0,
      icon: 'logoEnterpriseSearch',
      navLinkId: 'appSearch', // TODO - remove this once functional tests no longer rely on navLinkId
      app: ['kibana', 'appSearch'], // TODO: 'enterpriseSearch', 'workplaceSearch'
      catalogue: ['appSearch'], // TODO: 'enterpriseSearch', 'workplaceSearch'
      privileges: null,
    });

    /**
     * Register user access to the Enterprise Search plugins
     */
    capabilities.registerSwitcher(
      async (request: KibanaRequest, uiCapabilities: UICapabilities) => {
        const dependencies = { config, security, request, log: this.logger };

        const { hasAppSearchAccess, hasWorkplaceSearchAccess } = await checkAccess(dependencies);

        return {
          ...uiCapabilities,
          navLinks: {
            ...uiCapabilities.navLinks,
            app_search: hasAppSearchAccess,
            workplaceSearch: hasWorkplaceSearchAccess,
          },
          catalogue: {
            ...uiCapabilities.catalogue,
            app_search: hasAppSearchAccess,
            workplaceSearch: hasWorkplaceSearchAccess,
          },
        };
      }
    );

    /**
     * Register routes
     */
    const router = http.createRouter();
    const dependencies = { router, config, log: this.logger };

    registerPublicUrlRoute(dependencies);
    registerEnginesRoute(dependencies);
    registerWSOverviewRoute(dependencies);

    /**
     * Bootstrap the routes, saved objects, and collector for telemetry
     */
    savedObjects.registerType(appSearchTelemetryType);
    savedObjects.registerType(workplaceSearchTelemetryType);

    getStartServices().then(([coreStart]) => {
      const savedObjectsStarted = coreStart.savedObjects as SavedObjectsServiceStart;

      const telemetryRouteDependencies = {
        ...dependencies,
        getSavedObjectsService: () => savedObjectsStarted,
      };
      registerASTelemetryRoute(telemetryRouteDependencies);
      registerWSTelemetryRoute(telemetryRouteDependencies);

      if (usageCollection) {
        registerASTelemetryUsageCollector(usageCollection, savedObjectsStarted, this.logger);
        registerWSTelemetryUsageCollector(usageCollection, savedObjectsStarted, this.logger);
      }
    });
  }

  public start() {}

  public stop() {}
}
