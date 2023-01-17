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

import { searchGuideId, searchGuideConfig } from '../common/guided_onboarding/search_guide_config';

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

import { ConfigType } from '.';

interface PluginsSetup {
  usageCollection?: UsageCollectionSetup;
  security: SecurityPluginSetup;
  features: FeaturesPluginSetup;
  infra: InfraPluginSetup;
  customIntegrations?: CustomIntegrationsPluginSetup;
  ml?: MlPluginSetup;
  guidedOnboarding: GuidedOnboardingPluginSetup;
}

interface PluginsStart {
  spaces?: SpacesPluginStart;
  security: SecurityPluginStart;
  data: DataPluginStart;
}

export interface RouteDependencies {
  router: IRouter;
  config: ConfigType;
  log: Logger;
  enterpriseSearchRequestHandler: IEnterpriseSearchRequestHandler;
  getSavedObjectsService?(): SavedObjectsServiceStart;
  ml?: MlPluginSetup;
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
      APP_SEARCH_PLUGIN.ID,
      WORKPLACE_SEARCH_PLUGIN.ID,
      SEARCH_EXPERIENCES_PLUGIN.ID,
    ];

    if (customIntegrations) {
      registerEnterpriseSearchIntegrations(http, customIntegrations);
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
      const showEnterpriseSearch = hasAppSearchAccess || hasWorkplaceSearchAccess;

      return {
        navLinks: {
          enterpriseSearch: showEnterpriseSearch,
          enterpriseSearchContent: showEnterpriseSearch,
          enterpriseSearchAnalytics: showEnterpriseSearch,
          elasticsearch: showEnterpriseSearch,
          appSearch: hasAppSearchAccess,
          workplaceSearch: hasWorkplaceSearchAccess,
          searchExperiences: showEnterpriseSearch,
        },
        catalogue: {
          enterpriseSearch: showEnterpriseSearch,
          enterpriseSearchContent: showEnterpriseSearch,
          enterpriseSearchAnalytics: showEnterpriseSearch,
          elasticsearch: showEnterpriseSearch,
          appSearch: hasAppSearchAccess,
          workplaceSearch: hasWorkplaceSearchAccess,
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
    registerAppSearchRoutes(dependencies);
    registerEnterpriseSearchRoutes(dependencies);
    registerWorkplaceSearchRoutes(dependencies);
    // Enterprise Search Routes
    registerConnectorRoutes(dependencies);
    registerCrawlerRoutes(dependencies);
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
        indexName: 'logs-elastic_analytics.events-*',
        type: 'index_name',
      },
      name: 'Enterprise Search Behavioral Analytics Logs',
    });

    /**
     * Register a config for the search guide
     */
    guidedOnboarding.registerGuideConfig(searchGuideId, searchGuideConfig);
  }

  public start() {}

  public stop() {}
}
