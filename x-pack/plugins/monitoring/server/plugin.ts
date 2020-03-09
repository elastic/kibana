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
import { TelemetryCollectionManager } from 'src/legacy/core_plugins/telemetry/server/collection_manager';
import {
  LOGGING_TAG,
  KIBANA_MONITORING_LOGGING_TAG,
  KIBANA_ALERTING_ENABLED,
} from '../common/constants';
import {
  Logger,
  PluginInitializerContext,
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  CoreSetup,
  ICustomClusterClient,
  ElasticsearchConfig,
  ElasticsearchConfigType,
  UiSettingsServiceStart,
  CoreStart,
} from '../../../../src/core/server';
import { MonitoringConfig } from './config';
// @ts-ignore
import { requireUIRoutes } from './routes';
// @ts-ignore
import { instantiateClient, hasMonitoringCluster } from './es_client/instantiate_client';
// @ts-ignore
import { initBulkUploader, registerCollectors } from './kibana_monitoring';
// @ts-ignore
import { initInfraSource } from './lib/logs/init_infra_source';
import { registerMonitoringCollection } from './telemetry_collection';
import { LicensingPluginSetup } from '../../licensing/server';
import { PluginSetupContract as FeaturesPluginSetupContract } from '../../features/server';
import { LicenseService } from './license_service';
import { MonitoringLicenseService } from './types';
import {
  PluginStartContract as AlertingPluginStartContract,
  PluginSetupContract as AlertingPluginSetupContract,
} from '../../alerting/server';
import { getLicenseExpiration } from './alerts/license_expiration';
import { InfraPluginSetup } from '../../infra/server';

export interface LegacyAPI {
  telemetryCollectionManager: TelemetryCollectionManager;
  getServerStatus: () => string;
  infra: any;
}

interface PluginsSetup {
  usageCollection: UsageCollectionSetup;
  licensing: LicensingPluginSetup;
  features: FeaturesPluginSetupContract;
  alerting: AlertingPluginSetupContract;
  infra: InfraPluginSetup;
}

interface PluginsStart {
  alerting: AlertingPluginStartContract;
}

interface MonitoringCoreConfig {
  get: (key: string) => string;
}

interface MonitoringCore {
  config: () => MonitoringCoreConfig;
  log?: Logger;
  route?: (options: any) => void;
}

export class Plugin {
  private readonly initializerContext: PluginInitializerContext;
  private readonly log: Logger;
  private readonly getLogger: (...scopes: string[]) => Logger;
  private cluster?: ICustomClusterClient;
  private coreSetup?: CoreSetup;
  private licenseService?: MonitoringLicenseService;
  private legacyAPI?: LegacyAPI;
  private uiSettingsService?: UiSettingsServiceStart;
  private monitoringCore?: MonitoringCore;
  private setupPlugins?: PluginsSetup;
  private config?: MonitoringConfig;
  private needToSetupLegacy: boolean = true;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
    this.log = initializerContext.logger.get(LOGGING_TAG);
    this.getLogger = (...scopes: string[]) => initializerContext.logger.get(LOGGING_TAG, ...scopes);
  }

  async setup(core: CoreSetup, plugins: PluginsSetup) {
    this.coreSetup = core;
    this.setupPlugins = plugins;
    const config = await this.initializerContext.config
      .create<MonitoringConfig>()
      .pipe(first())
      .toPromise();

    this.config = config;
    // Monitoring creates and maintains a connection to a potentially
    // separate ES cluster - create this first
    const elasticsearchConfig = new ElasticsearchConfig(
      config.ui.elasticsearch as ElasticsearchConfigType
    );
    const cluster = (this.cluster = instantiateClient({
      log: this.log,
      elasticsearchConfig,
      elasticsearchPlugin: {
        createCluster: core.elasticsearch.createClient,
      },
    }));

    // Start our license service which will ensure
    // the appropriate licenses are present
    this.licenseService = new LicenseService().setup({
      licensing: plugins.licensing,
      monitoringClient: cluster,
      config,
      log: this.log,
    });
    await this.licenseService.refresh();

    if (KIBANA_ALERTING_ENABLED && this.cluster && this.getLogger) {
      plugins.alerting.registerType(
        getLicenseExpiration(
          () => this.uiSettingsService,
          this.cluster,
          this.getLogger,
          config.ui.ccs.enabled
        )
      );
    }

    if (config.ui.enabled) {
      this.registerPluginInUI(plugins);
    }

    return {
      registerLegacyAPI: (legacyAPI: LegacyAPI) => {
        this.legacyAPI = legacyAPI;
        if (this.needToSetupLegacy) {
          this.setupLegacy();
        }
      },
    };
  }

  async start(core: CoreStart, plugins: PluginsStart) {
    if (!this.coreSetup || !this.licenseService || !this.cluster) {
      return;
    }

    const [config, legacyConfig] = await combineLatest([
      this.initializerContext.config.create<MonitoringConfig>(),
      this.initializerContext.config.legacy.globalConfig$,
    ])
      .pipe(first())
      .toPromise();

    // Create our shim which is currently used to power our routing
    this.monitoringCore = await this.getLegacyShim(
      config,
      legacyConfig,
      this.coreSetup,
      plugins,
      this.licenseService,
      this.cluster
    );

    if (config.ui.enabled) {
      requireUIRoutes(this.monitoringCore);
      initInfraSource(this.monitoringCore.config(), this.setupPlugins?.infra);
    }

    this.uiSettingsService = core.uiSettings;
    if (this.legacyAPI) {
      this.setupLegacy();
      this.needToSetupLegacy = false;
    }
  }

  stop() {
    if (this.cluster) {
      this.cluster.close();
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
  }

  async setupLegacy() {
    if (!this.monitoringCore || !this.cluster || !this.legacyAPI) {
      return;
    }

    const legacyConfigWrapper = this.monitoringCore.config
      ? this.monitoringCore.config()
      : { get: () => null };
    const log = this.getLogger(LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG);

    // Initialize telemetry
    registerMonitoringCollection(this.cluster, this.legacyAPI.telemetryCollectionManager);
    // Register collector objects for stats to show up in the APIs
    registerCollectors(this.setupPlugins?.usageCollection, {
      config: legacyConfigWrapper,
      metrics$: this.coreSetup?.metrics.getOpsMetrics$(),
    });

    // If collection is enabled, create the bulk uploader
    const kibanaCollectionEnabled = this.config?.kibana.collection.enabled;
    if (kibanaCollectionEnabled) {
      // Start kibana internal collection
      const serverInfo = this.coreSetup?.http.getServerInfo();
      const legacyConfig = await this.initializerContext.config.legacy.globalConfig$
        .pipe(first())
        .toPromise();
      const bulkUploader = initBulkUploader({
        elasticsearch: this.coreSetup?.elasticsearch,
        config: this.config,
        log,
        kibanaStats: {
          uuid: this.coreSetup?.uuid.getInstanceUuid(),
          name: serverInfo?.name,
          index: get(legacyConfig, 'kibana.index'),
          host: serverInfo?.host,
          port: serverInfo?.port?.toString(),
          version: this.initializerContext.env.packageInfo.version,
          status: this.legacyAPI?.getServerStatus(),
        },
      });

      // Do not use `this.licenseService` as that looks at the monitoring cluster
      // whereas we want to check the production cluster here
      const licensing = this.setupPlugins?.licensing;
      if (licensing) {
        licensing.license$.subscribe((license: any) => {
          // use updated xpack license info to start/stop bulk upload
          const mainMonitoring = license.getFeature('monitoring');
          const monitoringBulkEnabled =
            mainMonitoring && mainMonitoring.isAvailable && mainMonitoring.isEnabled;
          if (monitoringBulkEnabled) {
            bulkUploader.start(this.setupPlugins?.usageCollection);
          } else {
            bulkUploader.handleNotEnabled();
          }
        });
      }
    } else if (!kibanaCollectionEnabled) {
      log.info('Internal collection for Kibana monitoring is disabled per configuration.');
    }

    initInfraSource(this.config, this.legacyAPI.infra);
  }

  async getLegacyShim(
    config: MonitoringConfig,
    legacyConfig: any,
    coreSetup: CoreSetup,
    plugins: PluginsStart,
    licenseService: MonitoringLicenseService,
    cluster: ICustomClusterClient
  ): Promise<MonitoringCore> {
    const router = coreSetup.http.createRouter();
    const legacyConfigWrapper = () => ({
      get: (_key: string): string => {
        const key = _key.includes('monitoring.') ? _key.split('monitoring.')[1] : _key;
        if (has(config, key)) {
          return get(config, key);
        }
        if (has(legacyConfig, key)) {
          return get(legacyConfig, key);
        }

        if (key === 'server.uuid') {
          return coreSetup.uuid.getInstanceUuid();
        }

        throw new Error(`Unknown key '${_key}'`);
      },
    });
    return {
      config: legacyConfigWrapper,
      log: this.log,
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
              logger: this.log,
              getLogger: this.getLogger,
              payload: req.body,
              getUiSettingsService: () => context.core.uiSettings.client,
              getAlertsClient: () => plugins.alerting.getAlertsClientWithRequest(req),
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
                          name === 'monitoring' ? cluster : coreSetup.elasticsearch.dataClient;
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
    };
  }
}
