/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { combineLatest } from 'rxjs';
import { first } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { has, get } from 'lodash';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG } from '../common/constants';
import {
  Logger,
  PluginInitializerContext,
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  CoreSetup,
  ICustomClusterClient,
} from '../../../../src/core/server';
import { MonitoringConfig } from './config';
// @ts-ignore
import { requireUIRoutes } from './routes';
// @ts-ignore
import { instantiateClient } from './es_client/instantiate_client';
// @ts-ignore
import { initMonitoringXpackInfo } from './init_monitoring_xpack_info';
// @ts-ignore
import { initBulkUploader, registerCollectors } from './kibana_monitoring';
import { registerMonitoringCollection } from './telemetry_collection';
import { parseElasticsearchConfig } from './es_client/parse_elasticsearch_config';
import { XPackMainPlugin } from '../../../legacy/plugins/xpack_main/server/xpack_main';
import { LicensingPluginSetup } from '../../licensing/server';

export interface LegacyAPI {
  xpackMain: XPackMainPlugin;
  telemetryCollectionManager: any;
  elasticsearch: any;
  legacyConfig: Record<string, string>;
  getOSInfo: () => any;
  hapiServer: any;
  callClusterFactory: any;
  kbnServerStatus: string;
  kbnServerVersion: string;
  serverEvents: any;
}

interface PluginsSetup {
  usageCollection?: UsageCollectionSetup;
  licensing?: LicensingPluginSetup;
}

interface MonitoringCoreConfig {
  get: (key: string) => string;
}
interface MonitoringCore {
  config?: () => MonitoringCoreConfig;
  log?: Logger;
  route?: (options: any) => void;
  xpackInfo?: any;
}

export class Plugin {
  private readonly initializerContext: PluginInitializerContext;
  private readonly log: Logger;
  private readonly getLogger: (...scopes: string[]) => Logger;
  private plugins: PluginsSetup = {};
  private cluster?: ICustomClusterClient;
  private monitoringCore: MonitoringCore = {};
  private core?: CoreSetup;

  private legacyAPI?: LegacyAPI;
  private readonly getLegacyAPI = () => {
    if (!this.legacyAPI) {
      throw new Error('Legacy API is not registered!');
    }
    return this.legacyAPI;
  };

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
    // this.configPromise = initializerContext.config
    //   .create<MonitoringConfig>()
    //   .pipe(first())
    //   .toPromise();
    this.log = initializerContext.logger.get(LOGGING_TAG);
    this.getLogger = (...scopes: string[]) => initializerContext.logger.get(LOGGING_TAG, ...scopes);
  }

  // TODO: NP
  // postInit(server) {
  //   const serverConfig = server.config();
  //   initInfraSource(serverConfig, server.plugins.infra);
  // },

  async setup(core: CoreSetup, plugins: PluginsSetup) {
    this.core = core;
    this.plugins = plugins;

    const [config, legacyConfig] = await combineLatest([
      this.initializerContext.config.create<MonitoringConfig>(),
      this.initializerContext.config.legacy.globalConfig$,
    ])
      .pipe(first())
      .toPromise();

    const router = core.http.createRouter();
    const serverInfo = core.http.getServerInfo();
    const monitoringCore = (this.monitoringCore = {
      config: () => ({
        get: (_key: string): string => {
          const key = _key.includes('monitoring.') ? _key.split('monitoring.')[1] : _key;
          if (has(config, key)) {
            return get(config, key);
          }
          if (has(legacyConfig, key)) {
            return get(legacyConfig, key);
          }
          if (key === 'server.port') return serverInfo.port?.toString();
          if (key === 'server.host') return serverInfo.host;
          if (key === 'server.name') return serverInfo.name;
          if (key === 'server.uuid') return core.uuid.getInstanceUuid();
          throw new Error(`Unknown key '${_key}'`);
        },
      }),
      log: this.log,
      xpackInfo: null,
      route: (options: any) => {
        const method = options.method;
        const handler = router.handleLegacyErrors(
          async (
            context: RequestHandlerContext,
            req: KibanaRequest<any, any, any, any>,
            res: KibanaResponseFactory
          ) => {
            const legacyRequest = {
              ...req,
              // TODO: NP
              logger: this.log,
              getLogger: this.getLogger,
              payload: req.body,
              getUiSettingsService: () => context.core.uiSettings.client,
              server: {
                config: monitoringCore.config,
                newPlatform: {
                  setup: {
                    plugins,
                  },
                },
                plugins: {
                  monitoring: {
                    info: this.monitoringCore.xpackInfo,
                  },
                  elasticsearch: {
                    getCluster: (name: string) => ({
                      callWithRequest: async (_req: any, endpoint: string, params: any) => {
                        const client =
                          name === 'monitoring' ? this.cluster : core.elasticsearch.dataClient;
                        return client?.asScoped(req).callAsCurrentUser(endpoint, params);
                      },
                    }),
                  },
                },
              },
            };
            const result = await options.handler(legacyRequest);
            return res.ok({ body: result });
          }
        );
        const validate: any = get(options, 'config.validate', false);
        if (validate && validate.payload) {
          validate.body = validate.payload;
        }
        options.validate = validate;

        if (method === 'POST') {
          router.post(options, handler);
        } else if (method === 'GET') {
          router.get(options, handler);
        } else if (method === 'PUT') {
          router.put(options, handler);
        } else {
          throw new Error('Unsupport API method: ' + method);
        }
      },
    });

    const uiEnabled = get(config, 'ui.enabled');
    if (uiEnabled) {
      await requireUIRoutes(this.monitoringCore);
    }

    // core.injectUiAppVars('monitoring', () => {
    //   return {
    //     maxBucketSize: monitoringCore.config().get('monitoring.ui.max_bucket_size'),
    //     minIntervalSeconds: monitoringCore.config().get('monitoring.ui.min_interval_seconds'),
    //     kbnIndex: monitoringCore.config().get('kibana.index'),
    //     showLicenseExpiration: monitoringCore.config().get('monitoring.ui.show_license_expiration'),
    //     showCgroupMetricsElasticsearch: monitoringCore
    //       .config()
    //       .get('monitoring.ui.container.elasticsearch.enabled'),
    //     showCgroupMetricsLogstash: monitoringCore
    //       .config()
    //       .get('monitoring.ui.container.logstash.enabled'), // Note, not currently used, but see https://github.com/elastic/x-pack-kibana/issues/1559 part 2
    //   };
    // });

    return {
      registerLegacyAPI: (legacyAPI: LegacyAPI) => {
        this.legacyAPI = legacyAPI;
        this.setupLegacy();
      },
    };
  }

  async setupLegacy() {
    const legacyApi = this.getLegacyAPI();
    const config = this.monitoringCore.config ? this.monitoringCore.config() : { get: () => null };
    const log = this.getLogger(LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG);

    legacyApi.xpackMain.registerFeature({
      id: 'monitoring',
      name: i18n.translate('xpack.monitoring.featureRegistry.monitoringFeatureName', {
        defaultMessage: 'Stack Monitoring',
      }),
      icon: 'monitoringApp',
      navLinkId: 'monitoring',
      app: ['monitoring', 'kibana'],
      catalogue: ['monitoring'],
      privileges: {},
      reserved: {
        privilege: {
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
        description: i18n.translate('xpack.monitoring.feature.reserved.description', {
          defaultMessage: 'To grant users access, you should also assign the monitoring_user role.',
        }),
      },
    });

    /*
     * Instantiate and start the internal background task that calls collector
     * fetch methods and uploads to the ES monitoring bulk endpoint
     */
    // TODO: NP
    // legacyApi.xpackMain.status.once('green', async () => {
    // first time xpack_main turns green
    const uiEnabled = config.get('monitoring.ui.enabled');
    if (uiEnabled) {
      // Instantiate the dedicated ES client
      const elasticsearchConfig = parseElasticsearchConfig(config);
      this.cluster = await instantiateClient({
        log: this.log,
        events: legacyApi.serverEvents,
        elasticsearchConfig,
        elasticsearchPlugin: {
          createCluster: this.core?.elasticsearch.createClient,
        },
      });

      // Route handlers depend on this for xpackInfo
      this.monitoringCore.xpackInfo = await initMonitoringXpackInfo({
        config,
        log: this.getLogger(LOGGING_TAG),
        xpackMainPlugin: legacyApi.xpackMain,
        // expose: core.expose,
      });
    }
    // });

    // Initialize telemetry
    registerMonitoringCollection(legacyApi.telemetryCollectionManager);

    // Register collector objects for stats to show up in the APIs
    registerCollectors(this.plugins.usageCollection, {
      elasticsearchPlugin: legacyApi.elasticsearch,
      interval: legacyApi.legacyConfig?.opsInterval,
      log,
      config,
      getOSInfo: legacyApi.getOSInfo,
      hapiServer: legacyApi.hapiServer,
    });

    // Start kibana internal collection
    const bulkUploader = initBulkUploader({
      elasticsearchPlugin: legacyApi.elasticsearch,
      config,
      log,
      kbnServerStatus: legacyApi.kbnServerStatus,
      kbnServerVersion: legacyApi.kbnServerVersion,
      callClusterFactory: legacyApi.callClusterFactory,
    });

    const kibanaCollectionEnabled = config.get('monitoring.kibana.collection.enabled');
    if (kibanaCollectionEnabled && this.plugins.licensing) {
      /*
       * Bulk uploading of Kibana stats
       */
      this.plugins.licensing.license$.subscribe((license: any) => {
        // use updated xpack license info to start/stop bulk upload
        const mainMonitoring = license.getFeature('monitoring');
        const monitoringBulkEnabled =
          mainMonitoring && mainMonitoring.isAvailable && mainMonitoring.isEnabled;
        if (monitoringBulkEnabled) {
          bulkUploader.start(this.plugins.usageCollection);
        } else {
          bulkUploader.handleNotEnabled();
        }
      });
    } else if (!kibanaCollectionEnabled) {
      log.info('Internal collection for Kibana monitoring is disabled per configuration.');
    }
  }

  start() {}

  stop() {
    if (this.cluster) {
      this.cluster.close();
    }
  }
}
