/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { combineLatest } from 'rxjs';
import { first } from 'rxjs/operators';
import { has, get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG } from '../common/constants';
import {
  Logger,
  PluginInitializerContext,
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
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
// import { registerMonitoringCollection } from './telemetry_collection';
import { parseElasticsearchConfig } from './es_client/parse_elasticsearch_config';
import { XPackMainPlugin } from '../../../legacy/plugins/xpack_main/server/xpack_main';

export interface LegacyAPI {
  xpackMain: XPackMainPlugin;
}

interface PluginsSetup {
  usageCollection?: UsageCollectionSetup;
}

export class Plugin {
  private readonly initializerContext: PluginInitializerContext;
  private readonly log: Logger;
  private readonly getLogger: (...scopes: string[]) => Logger;
  private cluster: any;

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

  async setup(core: any, plugins: PluginsSetup) {
    const [config, legacyConfig] = await combineLatest([
      this.initializerContext.config.create<MonitoringConfig>(),
      this.initializerContext.config.legacy.globalConfig$,
    ])
      .pipe(first())
      .toPromise();

    // const configs = [
    //   'monitoring.ui.enabled',
    //   'monitoring.kibana.collection.enabled',
    //   'monitoring.ui.max_bucket_size',
    //   'monitoring.ui.min_interval_seconds',
    //   'kibana.index',
    //   'monitoring.ui.show_license_expiration',
    //   'monitoring.ui.container.elasticsearch.enabled',
    //   'monitoring.ui.container.logstash.enabled',
    //   'monitoring.tests.cloud_detector.enabled',
    //   'monitoring.kibana.collection.interval',
    //   'monitoring.ui.elasticsearch.hosts',
    //   'monitoring.ui.elasticsearch',
    //   'monitoring.xpack_api_polling_frequency_millis',
    //   'server.uuid',
    //   'server.name',
    //   'server.host',
    //   'server.port',
    //   'monitoring.cluster_alerts.email_notifications.enabled',
    //   'monitoring.cluster_alerts.email_notifications.email_address',
    //   'monitoring.ui.ccs.enabled',
    //   'monitoring.ui.elasticsearch.logFetchCount',
    // ];

    const router = core.http.createRouter();
    const serverInfo = core.http.getServerInfo();
    const monitoringCore = {
      config: () => ({
        get: (key: string): string => {
          const stripped = key.split('monitoring.')[1];
          if (has(config, stripped)) {
            return get(config, stripped);
          }
          if (key === 'server.port') return serverInfo.port;
          if (key === 'server.host') return serverInfo.host;
          if (key === 'server.uuid') return core.uuid;
          throw new Error(`Unknown key '${key}'`);
        },
      }),
      // injectUiAppVars: monitoringCore.injectUiAppVars,
      log: this.log,
      // getOSInfo: monitoringCore.getOSInfo,
      // events: {
      //   on: (...args) => monitoringCore.events.on(...args),
      // },
      // expose: (...args) => monitoringCore.expose(...args),
      route: (options: any) => {
        const method = options.method.toLowerCase();
        const handler = async (
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
                elasticsearch: {
                  getCluster: () => ({
                    callWithRequest: (_req: any, endpoint: string, params: any) =>
                      this.cluster.asScoped(req).callAsCurrentUser(endpoint, params),
                  }),
                },
              },
            },
          };
          const result = await options.handler(legacyRequest);
          return res.ok({ body: result });
        };
        const validate: any = get(options, 'config.validate', false);
        if (validate && validate.payload) {
          validate.body = validate.payload;
        }
        options.validate = validate;
        router[method](options, handler);
      },
      // _hapi: server,
      // _kbnServer: this.kbnServer,
    };

    // const { usageCollection, licensing } = core.newPlatform.setup.plugins;
    // const monitoringPlugins = {
    //   xpack_main: monitoringCore.plugins.xpack_main,
    //   elasticsearch: monitoringCore.plugins.elasticsearch,
    //   infra: monitoringCore.plugins.infra,
    //   usageCollection,
    //   licensing,
    // };

    // const kbnServer = core._kbnServer;
    // const usageCollection = plugins.usageCollection;
    // const licensing = plugins.licensing;
    // registerMonitoringCollection();
    // /*
    //  * Register collector objects for stats to show up in the APIs
    //  */
    // registerCollectors(usageCollection, {
    //   elasticsearchPlugin: plugins.elasticsearch,
    //   kbnServerConfig: kbnServer.config,
    //   log: core.log,
    //   config,
    //   getOSInfo: core.getOSInfo,
    //   hapiServer: core._hapi,
    // });

    const uiEnabled = monitoringCore.config().get('monitoring.ui.enabled');

    /*
     * Parse the Elasticsearch config and read any certificates/keys if necessary
     */
    const elasticsearchConfig = parseElasticsearchConfig(monitoringCore.config());

    if (uiEnabled) {
      this.cluster = await instantiateClient({
        log: this.log,
        events: core.events,
        elasticsearchConfig,
        elasticsearchPlugin: {
          createCluster: core.elasticsearch.createClient,
        },
      }); // Instantiate the dedicated ES client
      // await initMonitoringXpackInfo({
      //   config,
      //   log: core.log,
      //   xpackMainPlugin: plugins.xpack_main,
      //   expose: core.expose,
      // }); // Route handlers depend on this for xpackInfo
      await requireUIRoutes(monitoringCore);
    }

    /*
     * Instantiate and start the internal background task that calls collector
     * fetch methods and uploads to the ES monitoring bulk endpoint
     */
    // const xpackMainPlugin = plugins.xpack_main;

    // xpackMainPlugin.status.once('green', async () => {
    //   // first time xpack_main turns green
    //   /*
    //    * End-user-facing services
    //    */
    // });

    // xpackMainPlugin.registerFeature({
    //   id: 'monitoring',
    //   name: i18n.translate('xpack.monitoring.featureRegistry.monitoringFeatureName', {
    //     defaultMessage: 'Stack Monitoring',
    //   }),
    //   icon: 'monitoringApp',
    //   navLinkId: 'monitoring',
    //   app: ['monitoring', 'kibana'],
    //   catalogue: ['monitoring'],
    //   privileges: {},
    //   reserved: {
    //     privilege: {
    //       savedObject: {
    //         all: [],
    //         read: [],
    //       },
    //       ui: [],
    //     },
    //     description: i18n.translate('xpack.monitoring.feature.reserved.description', {
    //       defaultMessage: 'To grant users access, you should also assign the monitoring_user role.',
    //     }),
    //   },
    // });

    // const bulkUploader = initBulkUploader({
    //   elasticsearchPlugin: plugins.elasticsearch,
    //   config,
    //   log: core.log,
    //   kbnServerStatus: kbnServer.status,
    //   kbnServerVersion: kbnServer.version,
    // });
    // const kibanaCollectionEnabled = config.get('monitoring.kibana.collection.enabled');

    // if (kibanaCollectionEnabled) {
    //   /*
    //    * Bulk uploading of Kibana stats
    //    */
    //   licensing.license$.subscribe((license: any) => {
    //     // use updated xpack license info to start/stop bulk upload
    //     const mainMonitoring = license.getFeature('monitoring');
    //     const monitoringBulkEnabled =
    //       mainMonitoring && mainMonitoring.isAvailable && mainMonitoring.isEnabled;
    //     if (monitoringBulkEnabled) {
    //       bulkUploader.start(usageCollection);
    //     } else {
    //       bulkUploader.handleNotEnabled();
    //     }
    //   });
    // } else if (!kibanaCollectionEnabled) {
    //   core.log(
    //     ['info', LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG],
    //     'Internal collection for Kibana monitoring is disabled per configuration.'
    //   );
    // }

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

    // return {
    //   __legacyCompat: {
    //     registerLegacyAPI: (legacyAPI: LegacyAPI) => {
    //       console.log('here');
    //       this.legacyAPI = legacyAPI;
    //       // this.setupLegacyComponents(
    //       //   spacesService,
    //       //   plugins.features,
    //       //   plugins.licensing,
    //       //   plugins.usageCollection
    //       // );
    //     },
    //   },
    // };
  }

  start() {

  }

  stop() {
    this.cluster.close();
  }
}
