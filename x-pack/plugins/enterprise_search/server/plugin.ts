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
} from '@kbn/core/server';
import { CustomIntegrationsPluginSetup } from '@kbn/custom-integrations-plugin/server';
import { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { GlobalSearchPluginSetup } from '@kbn/global-search-plugin/server';
import type { GuidedOnboardingPluginSetup } from '@kbn/guided-onboarding-plugin/server';
import { InfraPluginSetup } from '@kbn/infra-plugin/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

import {
  ENTERPRISE_SEARCH_OVERVIEW_PLUGIN,
  ENTERPRISE_SEARCH_CONTENT_PLUGIN,
  ELASTICSEARCH_PLUGIN,
  ANALYTICS_PLUGIN,
  APP_SEARCH_PLUGIN,
  WORKPLACE_SEARCH_PLUGIN,
  SEARCH_EXPERIENCES_PLUGIN,
  ENTERPRISE_SEARCH_RELEVANCE_LOGS_SOURCE_ID,
  ENTERPRISE_SEARCH_AUDIT_LOGS_SOURCE_ID,
  ENTERPRISE_SEARCH_ANALYTICS_LOGS_SOURCE_ID,
} from '../common/constants';

import {
  appSearchGuideId,
  websiteSearchGuideId,
  databaseSearchGuideId,
  appSearchGuideConfig,
  websiteSearchGuideConfig,
  databaseSearchGuideConfig,
} from '../common/guided_onboarding/search_guide_config';

import { registerTelemetryUsageCollector as registerASTelemetryUsageCollector } from './collectors/app_search/telemetry';
import { registerTelemetryUsageCollector as registerESTelemetryUsageCollector } from './collectors/enterprise_search/telemetry';
import { registerTelemetryUsageCollector as registerWSTelemetryUsageCollector } from './collectors/workplace_search/telemetry';
import { registerEnterpriseSearchIntegrations } from './integrations';

import { checkAccess } from './lib/check_access';
import { entSearchHttpAgent } from './lib/enterprise_search_http_agent';
import {
  EnterpriseSearchRequestHandler,
  IEnterpriseSearchRequestHandler,
} from './lib/enterprise_search_request_handler';

import { registerAppSearchRoutes } from './routes/app_search';
import { registerEnterpriseSearchRoutes } from './routes/enterprise_search';
import { registerAnalyticsRoutes } from './routes/enterprise_search/analytics';
import { registerConfigDataRoute } from './routes/enterprise_search/config_data';
import { registerConnectorRoutes } from './routes/enterprise_search/connectors';
import { registerCrawlerRoutes } from './routes/enterprise_search/crawler/crawler';
import { registerCreateAPIKeyRoute } from './routes/enterprise_search/create_api_key';
import { registerStatsRoutes } from './routes/enterprise_search/stats';
import { registerTelemetryRoute } from './routes/enterprise_search/telemetry';
import { registerWorkplaceSearchRoutes } from './routes/workplace_search';

import { appSearchTelemetryType } from './saved_objects/app_search/telemetry';
import { enterpriseSearchTelemetryType } from './saved_objects/enterprise_search/telemetry';
import { workplaceSearchTelemetryType } from './saved_objects/workplace_search/telemetry';

import { uiSettings as enterpriseSearchUISettings } from './ui_settings';

import { getSearchResultProvider } from './utils/search_result_provider';

import { ConfigType } from '.';

interface PluginsSetup {
  customIntegrations?: CustomIntegrationsPluginSetup;
  features: FeaturesPluginSetup;
  globalSearch: GlobalSearchPluginSetup;
  guidedOnboarding: GuidedOnboardingPluginSetup;
  infra: InfraPluginSetup;
  ml?: MlPluginSetup;
  security: SecurityPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

interface PluginsStart {
  data: DataPluginStart;
  security: SecurityPluginStart;
  spaces?: SpacesPluginStart;
}

export interface RouteDependencies {
  config: ConfigType;
  enterpriseSearchRequestHandler: IEnterpriseSearchRequestHandler;
  getSavedObjectsService?(): SavedObjectsServiceStart;
  log: Logger;
  ml?: MlPluginSetup;
  router: IRouter;
}

export class EnterpriseSearchPlugin implements Plugin {
  private readonly config: ConfigType;
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ConfigType>();
    this.logger = initializerContext.logger.get();
  }

  public setup(
    { capabilities, http, savedObjects, getStartServices, uiSettings }: CoreSetup<PluginsStart>,
    {
      usageCollection,
      security,
      features,
      globalSearch,
      infra,
      customIntegrations,
      ml,
      guidedOnboarding,
    }: PluginsSetup
  ) {
    const config = this.config;
    const log = this.logger;
    const PLUGIN_IDS = [
      ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.ID,
      ENTERPRISE_SEARCH_CONTENT_PLUGIN.ID,
      ELASTICSEARCH_PLUGIN.ID,
      ANALYTICS_PLUGIN.ID,
      ...(config.canDeployEntSearch ? [APP_SEARCH_PLUGIN.ID, WORKPLACE_SEARCH_PLUGIN.ID] : []),
      SEARCH_EXPERIENCES_PLUGIN.ID,
    ];

    if (customIntegrations) {
      registerEnterpriseSearchIntegrations(config, http, customIntegrations);
    }

    /*
     * Initialize config.ssl.certificateAuthorities file(s) - required for all API calls (+ access checks)
     */
    entSearchHttpAgent.initializeHttpAgent(config);

    /**
     * Register space/feature control
     */
    features.registerKibanaFeature({
      id: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.ID,
      name: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.NAME,
      order: 0,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      app: ['kibana', ...PLUGIN_IDS],
      catalogue: PLUGIN_IDS,
      privileges: null,
    });

    /**
     * Register Enterprise Search UI Settings
     */
    uiSettings.register(enterpriseSearchUISettings);

    /**
     * Register user access to the Enterprise Search plugins
     */
    capabilities.registerSwitcher(async (request: KibanaRequest) => {
      const [, { spaces }] = await getStartServices();

      const dependencies = { config, security, spaces, request, log, ml };

      const { hasAppSearchAccess, hasWorkplaceSearchAccess } = await checkAccess(dependencies);
      const showEnterpriseSearch =
        hasAppSearchAccess || hasWorkplaceSearchAccess || !config.canDeployEntSearch;

      return {
        navLinks: {
          enterpriseSearch: showEnterpriseSearch,
          enterpriseSearchContent: showEnterpriseSearch,
          enterpriseSearchAnalytics: showEnterpriseSearch,
          elasticsearch: showEnterpriseSearch,
          appSearch: hasAppSearchAccess && config.canDeployEntSearch,
          workplaceSearch: hasWorkplaceSearchAccess && config.canDeployEntSearch,
          searchExperiences: showEnterpriseSearch,
        },
        catalogue: {
          enterpriseSearch: showEnterpriseSearch,
          enterpriseSearchContent: showEnterpriseSearch,
          enterpriseSearchAnalytics: showEnterpriseSearch,
          elasticsearch: showEnterpriseSearch,
          appSearch: hasAppSearchAccess && config.canDeployEntSearch,
          workplaceSearch: hasWorkplaceSearchAccess && config.canDeployEntSearch,
          searchExperiences: showEnterpriseSearch,
        },
      };
    });

    /**
     * Register routes
     */
    const router = http.createRouter();
    const enterpriseSearchRequestHandler = new EnterpriseSearchRequestHandler({ config, log });
    const dependencies = { router, config, log, enterpriseSearchRequestHandler, ml };

    registerConfigDataRoute(dependencies);
    if (config.canDeployEntSearch) registerAppSearchRoutes(dependencies);
    registerEnterpriseSearchRoutes(dependencies);
    if (config.canDeployEntSearch) registerWorkplaceSearchRoutes(dependencies);
    // Enterprise Search Routes
    if (config.hasNativeConnectors) registerConnectorRoutes(dependencies);
    if (config.hasWebCrawler) registerCrawlerRoutes(dependencies);
    registerStatsRoutes(dependencies);

    // Analytics Routes (stand-alone product)
    getStartServices().then(([coreStart, { data }]) => {
      registerAnalyticsRoutes({ ...dependencies, data, savedObjects: coreStart.savedObjects });
    });

    getStartServices().then(([, { security: securityStart }]) => {
      registerCreateAPIKeyRoute(dependencies, securityStart);
    });

    /**
     * Bootstrap the routes, saved objects, and collector for telemetry
     */
    savedObjects.registerType(enterpriseSearchTelemetryType);
    if (config.canDeployEntSearch) {
      savedObjects.registerType(appSearchTelemetryType);
      savedObjects.registerType(workplaceSearchTelemetryType);
    }
    let savedObjectsStarted: SavedObjectsServiceStart;

    getStartServices().then(([coreStart]) => {
      savedObjectsStarted = coreStart.savedObjects;

      if (usageCollection) {
        registerESTelemetryUsageCollector(usageCollection, savedObjectsStarted, this.logger);
        if (config.canDeployEntSearch) {
          registerASTelemetryUsageCollector(usageCollection, savedObjectsStarted, this.logger);
          registerWSTelemetryUsageCollector(usageCollection, savedObjectsStarted, this.logger);
        }
      }
    });
    registerTelemetryRoute({ ...dependencies, getSavedObjectsService: () => savedObjectsStarted });

    /*
     * Register logs source configuration, used by LogStream components
     * @see https://github.com/elastic/kibana/blob/main/x-pack/plugins/infra/public/components/log_stream/log_stream.stories.mdx#with-a-source-configuration
     */
    infra.logViews.defineInternalLogView(ENTERPRISE_SEARCH_RELEVANCE_LOGS_SOURCE_ID, {
      logIndices: {
        indexName: 'logs-app_search.search_relevance_suggestions-*',
        type: 'index_name',
      },
      name: 'Enterprise Search Search Relevance Logs',
    });

    infra.logViews.defineInternalLogView(ENTERPRISE_SEARCH_AUDIT_LOGS_SOURCE_ID, {
      logIndices: {
        indexName: 'logs-enterprise_search*',
        type: 'index_name',
      },
      name: 'Enterprise Search Audit Logs',
    });

    infra.logViews.defineInternalLogView(ENTERPRISE_SEARCH_ANALYTICS_LOGS_SOURCE_ID, {
      logIndices: {
        indexName: 'behavioral_analytics-events-*',
        type: 'index_name',
      },
      name: 'Enterprise Search Behavioral Analytics Logs',
    });

    /**
     * Register a config for the search guide
     */
    if (config.canDeployEntSearch) {
      guidedOnboarding.registerGuideConfig(appSearchGuideId, appSearchGuideConfig);
    }
    if (config.hasWebCrawler) {
      guidedOnboarding.registerGuideConfig(websiteSearchGuideId, websiteSearchGuideConfig);
    }
    if (config.hasNativeConnectors) {
      guidedOnboarding.registerGuideConfig(databaseSearchGuideId, databaseSearchGuideConfig);
    }

    /**
     * Register our integrations in the global search bar
     */

    if (globalSearch) {
      globalSearch.registerResultProvider(getSearchResultProvider(http.basePath, config));
    }
  }

  public start() {}

  public stop() {}
}
