/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Plugin,
  PluginInitializerContext,
  CoreSetup,
  Logger,
  SavedObjectsServiceStart,
  IRouter,
  KibanaRequest,
  DEFAULT_APP_CATEGORIES,
} from '../../../../src/core/server';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { SecurityPluginSetup } from '../../security/server';
import { SpacesPluginStart } from '../../spaces/server';

import {
  ENTERPRISE_SEARCH_PLUGIN,
  APP_SEARCH_PLUGIN,
  WORKPLACE_SEARCH_PLUGIN,
} from '../common/constants';

import { registerTelemetryUsageCollector as registerASTelemetryUsageCollector } from './collectors/app_search/telemetry';
import { registerTelemetryUsageCollector as registerESTelemetryUsageCollector } from './collectors/enterprise_search/telemetry';
import { registerTelemetryUsageCollector as registerWSTelemetryUsageCollector } from './collectors/workplace_search/telemetry';

import { checkAccess } from './lib/check_access';
import {
  EnterpriseSearchRequestHandler,
  IEnterpriseSearchRequestHandler,
} from './lib/enterprise_search_request_handler';

import { registerAppSearchRoutes } from './routes/app_search';
import { registerConfigDataRoute } from './routes/enterprise_search/config_data';
import { registerTelemetryRoute } from './routes/enterprise_search/telemetry';
import { registerWorkplaceSearchRoutes } from './routes/workplace_search';

import { appSearchTelemetryType } from './saved_objects/app_search/telemetry';
import { enterpriseSearchTelemetryType } from './saved_objects/enterprise_search/telemetry';
import { workplaceSearchTelemetryType } from './saved_objects/workplace_search/telemetry';

import { ConfigType } from './';

interface PluginsSetup {
  usageCollection?: UsageCollectionSetup;
  security?: SecurityPluginSetup;
  features: FeaturesPluginSetup;
}

interface PluginsStart {
  spaces?: SpacesPluginStart;
}

export interface RouteDependencies {
  router: IRouter;
  config: ConfigType;
  log: Logger;
  enterpriseSearchRequestHandler: IEnterpriseSearchRequestHandler;
  getSavedObjectsService?(): SavedObjectsServiceStart;
}

export class EnterpriseSearchPlugin implements Plugin {
  private readonly config: ConfigType;
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ConfigType>();
    this.logger = initializerContext.logger.get();
  }

  public setup(
    { capabilities, http, savedObjects, getStartServices }: CoreSetup<PluginsStart>,
    { usageCollection, security, features }: PluginsSetup
  ) {
    const config = this.config;
    const log = this.logger;

    /**
     * Register space/feature control
     */
    features.registerKibanaFeature({
      id: ENTERPRISE_SEARCH_PLUGIN.ID,
      name: ENTERPRISE_SEARCH_PLUGIN.NAME,
      order: 0,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      app: [
        'kibana',
        ENTERPRISE_SEARCH_PLUGIN.ID,
        APP_SEARCH_PLUGIN.ID,
        WORKPLACE_SEARCH_PLUGIN.ID,
      ],
      catalogue: [ENTERPRISE_SEARCH_PLUGIN.ID, APP_SEARCH_PLUGIN.ID, WORKPLACE_SEARCH_PLUGIN.ID],
      privileges: null,
    });

    /**
     * Register user access to the Enterprise Search plugins
     */
    capabilities.registerSwitcher(async (request: KibanaRequest) => {
      const [, { spaces }] = await getStartServices();

      const dependencies = { config, security, spaces, request, log };

      const { hasAppSearchAccess, hasWorkplaceSearchAccess } = await checkAccess(dependencies);
      const showEnterpriseSearchOverview = hasAppSearchAccess || hasWorkplaceSearchAccess;

      return {
        navLinks: {
          enterpriseSearch: showEnterpriseSearchOverview,
          appSearch: hasAppSearchAccess,
          workplaceSearch: hasWorkplaceSearchAccess,
        },
        catalogue: {
          enterpriseSearch: showEnterpriseSearchOverview,
          appSearch: hasAppSearchAccess,
          workplaceSearch: hasWorkplaceSearchAccess,
        },
      };
    });

    /**
     * Register routes
     */
    const router = http.createRouter();
    const enterpriseSearchRequestHandler = new EnterpriseSearchRequestHandler({ config, log });
    const dependencies = { router, config, log, enterpriseSearchRequestHandler };

    registerConfigDataRoute(dependencies);
    registerAppSearchRoutes(dependencies);
    registerWorkplaceSearchRoutes(dependencies);

    /**
     * Bootstrap the routes, saved objects, and collector for telemetry
     */
    savedObjects.registerType(enterpriseSearchTelemetryType);
    savedObjects.registerType(appSearchTelemetryType);
    savedObjects.registerType(workplaceSearchTelemetryType);
    let savedObjectsStarted: SavedObjectsServiceStart;

    getStartServices().then(([coreStart]) => {
      savedObjectsStarted = coreStart.savedObjects;

      if (usageCollection) {
        registerESTelemetryUsageCollector(usageCollection, savedObjectsStarted, this.logger);
        registerASTelemetryUsageCollector(usageCollection, savedObjectsStarted, this.logger);
        registerWSTelemetryUsageCollector(usageCollection, savedObjectsStarted, this.logger);
      }
    });
    registerTelemetryRoute({ ...dependencies, getSavedObjectsService: () => savedObjectsStarted });
  }

  public start() {}

  public stop() {}
}
