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
import {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { InfraPluginSetup } from '@kbn/infra-plugin/server';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

import {
  ENTERPRISE_SEARCH_OVERVIEW_PLUGIN,
  ENTERPRISE_SEARCH_CONTENT_PLUGIN,
  ELASTICSEARCH_PLUGIN,
  APP_SEARCH_PLUGIN,
  WORKPLACE_SEARCH_PLUGIN,
  ENTERPRISE_SEARCH_RELEVANCE_LOGS_SOURCE_ID,
  ENTERPRISE_SEARCH_AUDIT_LOGS_SOURCE_ID,
} from '../common/constants';

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
import { registerTelemetryRoute } from './routes/enterprise_search/telemetry';
import { registerWorkplaceSearchRoutes } from './routes/workplace_search';

import { appSearchTelemetryType } from './saved_objects/app_search/telemetry';
import {
  ConnectorsEncryptionKey,
  connectorsEncryptionKeyType,
  CONNECTORS_ENCRYPTION_KEY_TYPE,
} from './saved_objects/enterprise_search/connectors_encryption_key';
import { enterpriseSearchTelemetryType } from './saved_objects/enterprise_search/telemetry';
import { workplaceSearchTelemetryType } from './saved_objects/workplace_search/telemetry';

import { ConfigType } from '.';

interface PluginsSetup {
  customIntegrations?: CustomIntegrationsPluginSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  features: FeaturesPluginSetup;
  infra: InfraPluginSetup;
  security: SecurityPluginSetup;
  usageCollection?: UsageCollectionSetup;
}

interface PluginsStart {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  security: SecurityPluginStart;
  spaces: SpacesPluginStart;
}

export interface RouteDependencies {
  config: ConfigType;
  enterpriseSearchRequestHandler: IEnterpriseSearchRequestHandler;
  getEncryptedSavedObjectsService(): EncryptedSavedObjectsPluginStart;
  getSavedObjectsService(): SavedObjectsServiceStart;
  log: Logger;
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
    { capabilities, http, savedObjects, getStartServices }: CoreSetup<PluginsStart>,
    {
      encryptedSavedObjects,
      usageCollection,
      security,
      features,
      infra,
      customIntegrations,
    }: PluginsSetup
  ) {
    const config = this.config;
    const log = this.logger;
    const PLUGIN_IDS = [
      ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.ID,
      ENTERPRISE_SEARCH_CONTENT_PLUGIN.ID,
      ELASTICSEARCH_PLUGIN.ID,
      APP_SEARCH_PLUGIN.ID,
      WORKPLACE_SEARCH_PLUGIN.ID,
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
     * Register user access to the Enterprise Search plugins
     */
    capabilities.registerSwitcher(async (request: KibanaRequest) => {
      const [, { spaces }] = await getStartServices();

      const dependencies = { config, security, spaces, request, log };

      const { hasAppSearchAccess, hasWorkplaceSearchAccess } = await checkAccess(dependencies);
      const showEnterpriseSearch = hasAppSearchAccess || hasWorkplaceSearchAccess;

      return {
        navLinks: {
          enterpriseSearch: showEnterpriseSearch,
          enterpriseSearchContent: showEnterpriseSearch,
          elasticsearch: showEnterpriseSearch,
          appSearch: hasAppSearchAccess,
          workplaceSearch: hasWorkplaceSearchAccess,
        },
        catalogue: {
          enterpriseSearch: showEnterpriseSearch,
          enterpriseSearchContent: showEnterpriseSearch,
          elasticsearch: showEnterpriseSearch,
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
    let encryptedSavedObjectsStarted: EncryptedSavedObjectsPluginStart;
    let savedObjectsStarted: SavedObjectsServiceStart;
    const dependencies = {
      config,
      enterpriseSearchRequestHandler,
      getEncryptedSavedObjectsService: () => encryptedSavedObjectsStarted,
      getSavedObjectsService: () => savedObjectsStarted,
      log,
      router,
    };

    registerConfigDataRoute(dependencies);
    registerAppSearchRoutes(dependencies);
    registerEnterpriseSearchRoutes(dependencies);
    registerWorkplaceSearchRoutes(dependencies);
    // Enterprise Search Routes
    registerConnectorRoutes(dependencies);
    registerCrawlerRoutes(dependencies);
    registerAnalyticsRoutes(dependencies);

    /**
     * Bootstrap the connectors encryption key
     */
    if (encryptedSavedObjects.canEncrypt) {
      savedObjects.registerType(connectorsEncryptionKeyType);
      encryptedSavedObjects.registerType({
        attributesToEncrypt: new Set(['private_key', 'public_key']),
        type: CONNECTORS_ENCRYPTION_KEY_TYPE,
      });
      getStartServices().then(
        async ([coreStart, { encryptedSavedObjects: encryptedSavedObjectsStart }]) => {
          encryptedSavedObjectsStarted = encryptedSavedObjectsStart;
          const baseSavedObjectResponse = await coreStart.savedObjects
            .createInternalRepository([CONNECTORS_ENCRYPTION_KEY_TYPE])
            .find<ConnectorsEncryptionKey>({ type: CONNECTORS_ENCRYPTION_KEY_TYPE });
          if (baseSavedObjectResponse.saved_objects[0]) {
            this.logger.info('Connectors encryption key is present');
            this.logger.info(JSON.stringify(baseSavedObjectResponse.saved_objects));
          } else {
            const crypto = await import('node:crypto');
            const keyPair = await crypto.generateKeyPairSync('x25519', {
              privateKeyEncoding: {
                format: 'pem',
                type: 'pkcs8',
              },
              publicKeyEncoding: {
                format: 'pem',
                type: 'spki',
              },
            });
            const client = coreStart.savedObjects.createInternalRepository([
              CONNECTORS_ENCRYPTION_KEY_TYPE,
            ]);
            const result = await client.create(CONNECTORS_ENCRYPTION_KEY_TYPE, {
              private_key: keyPair.privateKey,
              public_key: keyPair.publicKey,
            });
            const saved = await client.get(CONNECTORS_ENCRYPTION_KEY_TYPE, result.id);
            this.logger.info(JSON.stringify(saved));
            const privateKey = await encryptedSavedObjectsStart
              .getClient({ includedHiddenTypes: [CONNECTORS_ENCRYPTION_KEY_TYPE] })
              .createPointInTimeFinderDecryptedAsInternalUser({
                type: CONNECTORS_ENCRYPTION_KEY_TYPE,
              });
            this.logger.info(JSON.stringify(privateKey));
            this.logger.info('Created connectors encryption key');
          }
        }
      );
    } else {
      this.logger.warn(
        'Encrypted connector fields are disabled because the Encrypted Saved Objects plugin is missing an encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml or use the bin/kibana-encryption-keys command.'
      );
    }

    getStartServices().then(([, { security: securityStart }]) => {
      registerCreateAPIKeyRoute(dependencies, securityStart);
    });

    /**
     * Bootstrap the routes, saved objects, and collector for telemetry
     */

    savedObjects.registerType(enterpriseSearchTelemetryType);
    savedObjects.registerType(appSearchTelemetryType);
    savedObjects.registerType(workplaceSearchTelemetryType);

    getStartServices().then(([coreStart]) => {
      savedObjectsStarted = coreStart.savedObjects;

      if (usageCollection) {
        registerESTelemetryUsageCollector(usageCollection, savedObjectsStarted, this.logger);
        registerASTelemetryUsageCollector(usageCollection, savedObjectsStarted, this.logger);
        registerWSTelemetryUsageCollector(usageCollection, savedObjectsStarted, this.logger);
      }
    });
    registerTelemetryRoute(dependencies);

    /*
     * Register logs source configuration, used by LogStream components
     * @see https://github.com/elastic/kibana/blob/main/x-pack/plugins/infra/public/components/log_stream/log_stream.stories.mdx#with-a-source-configuration
     */
    infra.defineInternalSourceConfiguration(ENTERPRISE_SEARCH_RELEVANCE_LOGS_SOURCE_ID, {
      name: 'Enterprise Search Search Relevance Logs',
      logIndices: {
        type: 'index_name',
        indexName: 'logs-app_search.search_relevance_suggestions-*',
      },
    });

    infra.defineInternalSourceConfiguration(ENTERPRISE_SEARCH_AUDIT_LOGS_SOURCE_ID, {
      name: 'Enterprise Search Audit Logs',
      logIndices: {
        type: 'index_name',
        indexName: 'logs-enterprise_search*',
      },
    });
  }

  public start() {}

  public stop() {}
}
