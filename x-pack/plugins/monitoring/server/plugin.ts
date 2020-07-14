/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import { combineLatest } from 'rxjs';
import { first, map } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { has, get } from 'lodash';
import { TypeOf } from '@kbn/config-schema';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { TelemetryCollectionManagerPluginSetup } from 'src/plugins/telemetry_collection_manager/server';
import {
  Logger,
  PluginInitializerContext,
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  CoreSetup,
  ILegacyCustomClusterClient,
  CoreStart,
  IRouter,
  ILegacyClusterClient,
  CustomHttpResponseOptions,
  ResponseError,
} from 'kibana/server';
import {
  LOGGING_TAG,
  KIBANA_MONITORING_LOGGING_TAG,
  KIBANA_ALERTING_ENABLED,
  KIBANA_STATS_TYPE_MONITORING,
} from '../common/constants';
import { MonitoringConfig, createConfig, configSchema } from './config';
// @ts-ignore
import { requireUIRoutes } from './routes';
// @ts-ignore
import { initBulkUploader } from './kibana_monitoring';
// @ts-ignore
import { initInfraSource } from './lib/logs/init_infra_source';
import { instantiateClient } from './es_client/instantiate_client';
import { registerCollectors } from './kibana_monitoring/collectors';
import { registerMonitoringCollection } from './telemetry_collection';
import { LicensingPluginSetup } from '../../licensing/server';
import { PluginSetupContract as FeaturesPluginSetupContract } from '../../features/server';
import { LicenseService } from './license_service';
import { MonitoringLicenseService } from './types';
import {
  PluginStartContract as AlertingPluginStartContract,
  PluginSetupContract as AlertingPluginSetupContract,
} from '../../alerts/server';
import { getLicenseExpiration } from './alerts/license_expiration';
import { getClusterState } from './alerts/cluster_state';
import { InfraPluginSetup } from '../../infra/server';

export interface LegacyAPI {
  getServerStatus: () => string;
}

interface PluginsSetup {
  telemetryCollectionManager?: TelemetryCollectionManagerPluginSetup;
  usageCollection?: UsageCollectionSetup;
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetupContract;
  alerts: AlertingPluginSetupContract;
  infra: InfraPluginSetup;
}

interface PluginsStart {
  alerts: AlertingPluginStartContract;
}

interface MonitoringCoreConfig {
  get: (key: string) => string | undefined;
}

interface MonitoringCore {
  config: () => MonitoringCoreConfig;
  log: Logger;
  route: (options: any) => void;
}

interface LegacyShimDependencies {
  router: IRouter;
  instanceUuid: string;
  esDataClient: ILegacyClusterClient;
  kibanaStatsCollector: any;
}

interface IBulkUploader {
  setKibanaStatusGetter: (getter: () => string | undefined) => void;
  getKibanaStats: () => any;
}

// This is used to test the version of kibana
const snapshotRegex = /-snapshot/i;

const wrapError = (error: any): CustomHttpResponseOptions<ResponseError> => {
  const options = { statusCode: error.statusCode ?? 500 };
  const boom = Boom.isBoom(error) ? error : Boom.boomify(error, options);
  return {
    body: boom,
    headers: boom.output.headers,
    statusCode: boom.output.statusCode,
  };
};

export class Plugin {
  private readonly initializerContext: PluginInitializerContext;
  private readonly log: Logger;
  private readonly getLogger: (...scopes: string[]) => Logger;
  private cluster = {} as ILegacyCustomClusterClient;
  private licenseService = {} as MonitoringLicenseService;
  private monitoringCore = {} as MonitoringCore;
  private legacyShimDependencies = {} as LegacyShimDependencies;
  private bulkUploader = {} as IBulkUploader;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
    this.log = initializerContext.logger.get(LOGGING_TAG);
    this.getLogger = (...scopes: string[]) => initializerContext.logger.get(LOGGING_TAG, ...scopes);
  }

  async setup(core: CoreSetup, plugins: PluginsSetup) {
    const [config, legacyConfig] = await combineLatest([
      this.initializerContext.config
        .create<TypeOf<typeof configSchema>>()
        .pipe(map((rawConfig) => createConfig(rawConfig))),
      this.initializerContext.config.legacy.globalConfig$,
    ])
      .pipe(first())
      .toPromise();

    this.legacyShimDependencies = {
      router: core.http.createRouter(),
      instanceUuid: core.uuid.getInstanceUuid(),
      esDataClient: core.elasticsearch.legacy.client,
      kibanaStatsCollector: plugins.usageCollection?.getCollectorByType(
        KIBANA_STATS_TYPE_MONITORING
      ),
    };

    // Monitoring creates and maintains a connection to a potentially
    // separate ES cluster - create this first
    const cluster = (this.cluster = instantiateClient(
      config.ui.elasticsearch,
      this.log,
      core.elasticsearch.legacy.createClient
    ));

    // Start our license service which will ensure
    // the appropriate licenses are present
    this.licenseService = new LicenseService().setup({
      licensing: plugins.licensing,
      monitoringClient: cluster,
      config,
      log: this.log,
    });
    await this.licenseService.refresh();

    if (KIBANA_ALERTING_ENABLED) {
      plugins.alerts.registerType(
        getLicenseExpiration(
          async () => {
            const coreStart = (await core.getStartServices())[0];
            return coreStart.uiSettings;
          },
          cluster,
          this.getLogger,
          config.ui.ccs.enabled
        )
      );
      plugins.alerts.registerType(
        getClusterState(
          async () => {
            const coreStart = (await core.getStartServices())[0];
            return coreStart.uiSettings;
          },
          cluster,
          this.getLogger,
          config.ui.ccs.enabled
        )
      );
    }

    // Initialize telemetry
    if (plugins.telemetryCollectionManager) {
      registerMonitoringCollection(plugins.telemetryCollectionManager, this.cluster, {
        maxBucketSize: config.ui.max_bucket_size,
      });
    }

    // Register collector objects for stats to show up in the APIs
    if (plugins.usageCollection) {
      registerCollectors(plugins.usageCollection, config);
    }

    // If collection is enabled, create the bulk uploader
    const kibanaMonitoringLog = this.getLogger(KIBANA_MONITORING_LOGGING_TAG);
    const kibanaCollectionEnabled = config.kibana.collection.enabled;
    if (kibanaCollectionEnabled) {
      // Start kibana internal collection
      const serverInfo = core.http.getServerInfo();
      const bulkUploader = (this.bulkUploader = initBulkUploader({
        elasticsearch: core.elasticsearch,
        config,
        log: kibanaMonitoringLog,
        kibanaStats: {
          uuid: core.uuid.getInstanceUuid(),
          name: serverInfo.name,
          index: get(legacyConfig, 'kibana.index'),
          host: serverInfo.hostname,
          locale: i18n.getLocale(),
          port: serverInfo.port.toString(),
          transport_address: `${serverInfo.hostname}:${serverInfo.port}`,
          version: this.initializerContext.env.packageInfo.version,
          snapshot: snapshotRegex.test(this.initializerContext.env.packageInfo.version),
        },
      }));

      // Do not use `this.licenseService` as that looks at the monitoring cluster
      // whereas we want to check the production cluster here
      if (plugins.licensing) {
        plugins.licensing.license$.subscribe((license: any) => {
          // use updated xpack license info to start/stop bulk upload
          const mainMonitoring = license.getFeature('monitoring');
          const monitoringBulkEnabled =
            mainMonitoring && mainMonitoring.isAvailable && mainMonitoring.isEnabled;
          if (monitoringBulkEnabled) {
            bulkUploader.start(plugins.usageCollection);
          } else {
            bulkUploader.handleNotEnabled();
          }
        });
      }
    } else {
      kibanaMonitoringLog.info(
        'Internal collection for Kibana monitoring is disabled per configuration.'
      );
    }

    // If the UI is enabled, then we want to register it so it shows up
    // and start any other UI-related setup tasks
    if (config.ui.enabled) {
      // Create our shim which is currently used to power our routing
      this.monitoringCore = this.getLegacyShim(
        config,
        legacyConfig,
        core.getStartServices as () => Promise<[CoreStart, PluginsStart, {}]>,
        this.licenseService,
        this.cluster
      );

      this.registerPluginInUI(plugins);
      requireUIRoutes(this.monitoringCore);
      initInfraSource(config, plugins.infra);
    }

    return {
      // The legacy plugin calls this to register certain legacy dependencies
      // that are necessary for the plugin to properly run
      registerLegacyAPI: (legacyAPI: LegacyAPI) => {
        this.setupLegacy(legacyAPI);
      },
      // OSS stats api needs to call this in order to centralize how
      // we fetch kibana specific stats
      getKibanaStats: () => this.bulkUploader.getKibanaStats(),
    };
  }

  start() {}

  stop() {
    if (this.cluster) {
      this.cluster.close();
    }
    if (this.licenseService) {
      this.licenseService.stop();
    }
  }

  registerPluginInUI(plugins: PluginsSetup) {
    plugins.features.registerFeature({
      id: 'monitoring',
      name: i18n.translate('xpack.monitoring.featureRegistry.monitoringFeatureName', {
        defaultMessage: 'Stack Monitoring',
      }),
      icon: 'monitoringApp',
      navLinkId: 'monitoring',
      app: ['monitoring', 'kibana'],
      catalogue: ['monitoring'],
      privileges: null,
      reserved: {
        description: i18n.translate('xpack.monitoring.feature.reserved.description', {
          defaultMessage: 'To grant users access, you should also assign the monitoring_user role.',
        }),
        privileges: [
          {
            id: 'monitoring',
            privilege: {
              app: ['monitoring', 'kibana'],
              catalogue: ['monitoring'],
              savedObject: {
                all: [],
                read: [],
              },
              ui: [],
            },
          },
        ],
      },
    });
  }

  async setupLegacy(legacyAPI: LegacyAPI) {
    // Set the stats getter
    this.bulkUploader.setKibanaStatusGetter(() => legacyAPI.getServerStatus());
  }

  getLegacyShim(
    config: MonitoringConfig,
    legacyConfig: any,
    getCoreServices: () => Promise<[CoreStart, PluginsStart, {}]>,
    licenseService: MonitoringLicenseService,
    cluster: ILegacyCustomClusterClient
  ): MonitoringCore {
    const router = this.legacyShimDependencies.router;
    const legacyConfigWrapper = () => ({
      get: (_key: string): string | undefined => {
        const key = _key.includes('monitoring.') ? _key.split('monitoring.')[1] : _key;
        if (has(config, key)) {
          return get(config, key);
        }
        if (has(legacyConfig, key)) {
          return get(legacyConfig, key);
        }

        if (key === 'server.uuid') {
          return this.legacyShimDependencies.instanceUuid;
        }

        throw new Error(`Unknown key '${_key}'`);
      },
    });
    return {
      config: legacyConfigWrapper,
      log: this.log,
      route: (options: any) => {
        const method = options.method;
        const handler = async (
          context: RequestHandlerContext,
          req: KibanaRequest<any, any, any, any>,
          res: KibanaResponseFactory
        ) => {
          const plugins = (await getCoreServices())[1];
          const legacyRequest = {
            ...req,
            logger: this.log,
            getLogger: this.getLogger,
            payload: req.body,
            getKibanaStatsCollector: () => this.legacyShimDependencies.kibanaStatsCollector,
            getUiSettingsService: () => context.core.uiSettings.client,
            getAlertsClient: () => plugins.alerts.getAlertsClientWithRequest(req),
            server: {
              config: legacyConfigWrapper,
              newPlatform: {
                setup: {
                  plugins,
                },
              },
              plugins: {
                monitoring: {
                  info: licenseService,
                },
                elasticsearch: {
                  getCluster: (name: string) => ({
                    callWithRequest: async (_req: any, endpoint: string, params: any) => {
                      const client =
                        name === 'monitoring' ? cluster : this.legacyShimDependencies.esDataClient;
                      return client.asScoped(req).callAsCurrentUser(endpoint, params);
                    },
                  }),
                },
              },
            },
          };
          try {
            const result = await options.handler(legacyRequest);
            return res.ok({ body: result });
          } catch (err) {
            const statusCode: number = err.output?.statusCode || err.statusCode || err.status;
            if (Boom.isBoom(err) || statusCode !== 500) {
              return res.customError({ statusCode, body: err });
            }
            return res.internalError(wrapError(err));
          }
        };

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
    };
  }
}
