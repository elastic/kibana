/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { TypeOf } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import {
  CoreSetup,
  CoreStart,
  CustomHttpResponseOptions,
  ICustomClusterClient,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
  Plugin,
  PluginInitializerContext,
  ResponseError,
} from '@kbn/core/server';
import { get } from 'lodash';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import {
  KIBANA_MONITORING_LOGGING_TAG,
  KIBANA_STATS_TYPE_MONITORING,
  RULES,
  LOGGING_TAG,
  SAVED_OBJECT_TELEMETRY,
} from '../common/constants';
import { AlertsFactory } from './alerts';
import { configSchema, createConfig, MonitoringConfig } from './config';
import { instantiateClient } from './es_client/instantiate_client';
import { initBulkUploader } from './kibana_monitoring';
import { registerCollectors } from './kibana_monitoring/collectors';
import { initInfraSource } from './lib/logs/init_infra_source';
import { LicenseService } from './license_service';
import { requireUIRoutes } from './routes';
import { EndpointTypes, Globals } from './static_globals';
import { registerMonitoringTelemetryCollection } from './telemetry_collection';
import {
  IBulkUploader,
  LegacyRequest,
  LegacyShimDependencies,
  MonitoringConfigSchema,
  MonitoringCore,
  MonitoringLicenseService,
  MonitoringPluginSetup,
  PluginsSetup,
  PluginsStart,
  RequestHandlerContextMonitoringPlugin,
} from './types';

// This is used to test the version of kibana
const snapshotRegex = /-snapshot/i;

const wrapError = (error: any): CustomHttpResponseOptions<ResponseError> => {
  const options = { statusCode: error.statusCode ?? 500 };
  const boom = Boom.isBoom(error) ? error : Boom.boomify(error, options);
  return {
    body: boom,
    headers: boom.output.headers as { [key: string]: string },
    statusCode: boom.output.statusCode,
  };
};

export class MonitoringPlugin
  implements Plugin<MonitoringPluginSetup, void, PluginsSetup, PluginsStart>
{
  private readonly initializerContext: PluginInitializerContext;
  private readonly log: Logger;
  private readonly getLogger: (...scopes: string[]) => Logger;
  private cluster = {} as ICustomClusterClient;
  private licenseService = {} as MonitoringLicenseService;
  private monitoringCore = {} as MonitoringCore;
  private legacyShimDependencies = {} as LegacyShimDependencies;
  private bulkUploader?: IBulkUploader;

  private readonly config: MonitoringConfig;
  private coreSetup?: CoreSetup;
  private setupPlugins?: PluginsSetup;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
    this.log = initializerContext.logger.get(LOGGING_TAG);
    this.getLogger = (...scopes: string[]) => initializerContext.logger.get(LOGGING_TAG, ...scopes);
    this.config = createConfig(this.initializerContext.config.get<MonitoringConfigSchema>());
  }

  setup(coreSetup: CoreSetup, plugins: PluginsSetup) {
    this.coreSetup = coreSetup;
    this.setupPlugins = plugins;

    const serverInfo = coreSetup.http.getServerInfo();
    const kibanaMonitoringLog = this.getLogger(KIBANA_MONITORING_LOGGING_TAG);
    this.bulkUploader = initBulkUploader({
      config: this.config,
      log: kibanaMonitoringLog,
      opsMetrics$: coreSetup.metrics.getOpsMetrics$(),
      statusGetter$: coreSetup.status.overall$,
      kibanaStats: {
        uuid: this.initializerContext.env.instanceUuid,
        name: serverInfo.name,
        index: coreSetup.savedObjects.getKibanaIndex(),
        host: serverInfo.hostname,
        locale: i18n.getLocale(),
        port: serverInfo.port.toString(),
        transport_address: `${serverInfo.hostname}:${serverInfo.port}`,
        version: this.initializerContext.env.packageInfo.version,
        snapshot: snapshotRegex.test(this.initializerContext.env.packageInfo.version),
      },
    });

    Globals.init({
      initializerContext: this.initializerContext,
      config: this.config!,
      getLogger: this.getLogger,
      log: this.log,
      coreSetup: this.coreSetup!,
      setupPlugins: this.setupPlugins!,
    });

    const alerts = AlertsFactory.getAll();
    for (const alert of alerts) {
      plugins.alerting?.registerType(alert.getRuleType());
    }

    const config = createConfig(this.initializerContext.config.get<TypeOf<typeof configSchema>>());

    // Register collector objects for stats to show up in the APIs
    if (plugins.usageCollection) {
      coreSetup.savedObjects.registerType({
        name: SAVED_OBJECT_TELEMETRY,
        hidden: true,
        namespaceType: 'agnostic',
        mappings: {
          properties: {
            reportedClusterUuids: {
              type: 'keyword',
            },
          },
        },
      });

      registerCollectors(plugins.usageCollection, config, () => this.cluster);
      registerMonitoringTelemetryCollection(
        plugins.usageCollection,
        () => this.cluster,
        config.ui.max_bucket_size
      );
    }
    if (config.ui.enabled) {
      this.registerPluginInUI(plugins);
    }

    return {
      // OSS stats api needs to call this in order to centralize how
      // we fetch kibana specific stats
      getKibanaStats: () => this.bulkUploader?.getKibanaStats() || {},
    };
  }

  init(cluster: ICustomClusterClient, coreStart: CoreStart) {
    const config = createConfig(this.initializerContext.config.get<MonitoringConfigSchema>());
    const coreSetup = this.coreSetup!;
    const plugins = this.setupPlugins!;

    const router = coreSetup.http.createRouter<RequestHandlerContextMonitoringPlugin>();
    // const [{ elasticsearch }] = await core.getStartServices();
    this.legacyShimDependencies = {
      router,
      instanceUuid: this.initializerContext.env.instanceUuid,
      esDataClient: coreStart.elasticsearch.client.asInternalUser,
      kibanaStatsCollector: plugins.usageCollection?.getCollectorByType(
        KIBANA_STATS_TYPE_MONITORING
      ),
    };

    // If the UI is enabled, then we want to register it, so it shows up
    // and start any other UI-related setup tasks
    if (config.ui.enabled) {
      // Create our shim which is currently used to power our routing
      this.monitoringCore = this.getLegacyShim(
        config,
        coreSetup.getStartServices as () => Promise<[CoreStart, PluginsStart, {}]>,
        cluster,
        plugins
      );

      if (config.ui.debug_mode) {
        this.log.info('MONITORING DEBUG MODE: ON');
      }

      requireUIRoutes(this.monitoringCore, config, {
        cluster,
        router,
        licenseService: this.licenseService,
        encryptedSavedObjects: plugins.encryptedSavedObjects,
        alerting: plugins.alerting,
        logger: this.log,
      });
      initInfraSource(config, plugins.infra);
    }
  }

  start(coreStart: CoreStart, { licensing }: PluginsStart) {
    const config = this.config!;
    this.cluster = instantiateClient(
      config.ui.elasticsearch,
      this.log,
      coreStart.elasticsearch.createClient
    );

    this.init(this.cluster, coreStart);

    // Start our license service which will ensure
    // the appropriate licenses are present
    this.licenseService = new LicenseService().setup({
      licensing,
      monitoringClient: this.cluster,
      config,
      log: this.log,
    });

    // If collection is enabled, start it
    const kibanaMonitoringLog = this.getLogger(KIBANA_MONITORING_LOGGING_TAG);
    const kibanaCollectionEnabled = config.kibana.collection.enabled;
    if (kibanaCollectionEnabled) {
      // Do not use `this.licenseService` as that looks at the monitoring cluster
      // whereas we want to check the production cluster here
      if (this.bulkUploader && licensing) {
        licensing.license$.subscribe((license: any) => {
          // use updated xpack license info to start/stop bulk upload
          const mainMonitoring = license.getFeature('monitoring');
          const monitoringBulkEnabled =
            mainMonitoring && mainMonitoring.isAvailable && mainMonitoring.isEnabled;
          if (monitoringBulkEnabled) {
            this.bulkUploader?.start(coreStart.elasticsearch.client.asInternalUser);
          } else {
            this.bulkUploader?.handleNotEnabled();
          }
        });
      } else {
        kibanaMonitoringLog.warn(
          'Internal collection for Kibana monitoring is disabled due to missing license information.'
        );
      }
    } else {
      kibanaMonitoringLog.info(
        'Internal collection for Kibana monitoring is disabled per configuration.'
      );
    }
  }

  stop() {
    if (this.cluster && this.cluster.close) {
      this.cluster.close();
    }
    if (this.licenseService && this.licenseService.stop) {
      this.licenseService.stop();
    }
    this.bulkUploader?.stop();
  }

  registerPluginInUI(plugins: PluginsSetup) {
    plugins.features.registerKibanaFeature({
      id: 'monitoring',
      name: i18n.translate('xpack.monitoring.featureRegistry.monitoringFeatureName', {
        defaultMessage: 'Stack Monitoring',
      }),
      category: DEFAULT_APP_CATEGORIES.management,
      app: ['monitoring', 'kibana'],
      catalogue: ['monitoring'],
      privileges: null,
      alerting: RULES,
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
              alerting: {
                rule: {
                  all: RULES,
                },
                alert: {
                  all: RULES,
                },
              },
              ui: [],
            },
          },
        ],
      },
    });
  }

  getLegacyShim(
    config: MonitoringConfig,
    getCoreServices: () => Promise<[CoreStart, PluginsStart, {}]>,
    cluster: ICustomClusterClient,
    setupPlugins: PluginsSetup
  ): MonitoringCore {
    const router = this.legacyShimDependencies.router;
    return {
      config,
      log: this.log,
      route: (options: any) => {
        const method = options.method;
        const handler = async (
          context: RequestHandlerContextMonitoringPlugin,
          req: KibanaRequest<any, any, any>,
          res: KibanaResponseFactory
        ) => {
          const plugins = (await getCoreServices())[1];
          const legacyRequest: LegacyRequest = {
            ...req,
            logger: this.log,
            getLogger: this.getLogger,
            payload: req.body,
            getKibanaStatsCollector: () => this.legacyShimDependencies.kibanaStatsCollector,
            getUiSettingsService: () => context.core.uiSettings.client,
            getActionTypeRegistry: () => context.actions?.listTypes(),
            getRulesClient: () => {
              try {
                return plugins.alerting.getRulesClientWithRequest(req);
              } catch (err) {
                // If security is disabled, this call will throw an error unless a certain config is set for dist builds
                return null;
              }
            },
            getActionsClient: () => {
              try {
                return plugins.actions.getActionsClientWithRequest(req);
              } catch (err) {
                // If security is disabled, this call will throw an error unless a certain config is set for dist builds
                return null;
              }
            },
            server: {
              instanceUuid: this.legacyShimDependencies.instanceUuid,
              log: this.log,
              route: () => {},
              config,
              newPlatform: {
                setup: {
                  plugins: setupPlugins,
                },
              },
              plugins: {
                monitoring: {
                  info: {
                    getLicenseService: () => this.licenseService,
                  },
                },
                elasticsearch: {
                  getCluster: (name: string) => ({
                    callWithRequest: async (_req: any, endpoint: EndpointTypes, params: any) => {
                      const client =
                        name === 'monitoring'
                          ? cluster.asScoped(req).asCurrentUser
                          : context.core.elasticsearch.client.asCurrentUser;
                      return await Globals.app.getLegacyClusterShim(client, endpoint, params);
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
            const statusCode: number =
              err.output?.statusCode || err.statusCode || err.status || 500;
            if (Boom.isBoom(err) || statusCode !== 500) {
              return res.customError({ statusCode, body: err });
            }
            throw wrapError(err).body;
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
          throw new Error('Unsupported API method: ' + method);
        }
      },
    };
  }
}
