/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import fs from 'fs';
import { combineLatest } from 'rxjs';
import { first, map } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { has, get, setWith } from 'lodash';
import { TypeOf } from '@kbn/config-schema';
import {
  Logger,
  PluginInitializerContext,
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  CoreSetup,
  ILegacyCustomClusterClient,
  CoreStart,
  CustomHttpResponseOptions,
  ResponseError,
} from 'kibana/server';
import {
  LOGGING_TAG,
  KIBANA_MONITORING_LOGGING_TAG,
  KIBANA_STATS_TYPE_MONITORING,
  ALERTS,
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
import { LicenseService } from './license_service';
import { AlertsFactory } from './alerts';
import {
  MonitoringCore,
  MonitoringLicenseService,
  LegacyShimDependencies,
  IBulkUploader,
  PluginsSetup,
  PluginsStart,
  LegacyAPI,
  LegacyRequest,
} from './types';

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

let fieldCount = 0;

function setOnFields(fields, field, existingMappings) {
  // Ensure we properly nest the field
  let updatedField = field;
  const fieldSplit = field.split('.');
  if (fieldSplit.length > 1) {
    updatedField = fieldSplit.slice(1).reduce((accum, part) => {
      return `${accum}.properties.${part}`;
    }, fieldSplit[0]);
  }

  const existing = get(existingMappings.properties, updatedField);
  if (existing) {
    console.log(`Setting '${updatedField}'`);
    fieldCount++;
    setWith(fields, updatedField, existing.type ? existing : { type: 'object' }, Object);
  } else {
    console.log(`Not setting '${updatedField}' because not found in mappings`);
  }
  // console.log({ field, updatedField, value })

}

function setFieldsFromBoolInner(clause, fields, existingMappings) {
  let field = null;
  if (clause.term) {
    field = Object.keys(clause.term)[0];
  } else if (clause.range) {
    field = Object.keys(clause.range)[0];
  }

  if (field) {
    setOnFields(fields, field, existingMappings);
  }
}

function setFieldsFromAggInner(agg, fields, existingMappings) {
  const field = agg.field;
  if (field) {
    setOnFields(fields, field, existingMappings);
  }
}

function setFieldsFromBool(bool, fields, existingMappings) {
  if (!bool) {
    return;
  }

  if (bool.filter) {
    for (const filter of bool.filter) {
      if (filter.bool) {
        setFieldsFromBool(filter.bool, fields, existingMappings);
      } else if (filter.should) {
        if (Array.isArray(filter.should)) {
          filter.should.forEach((clause) =>
            setFieldsFromBoolInner(clause, fields, existingMappings)
          );
        } else {
          setFieldsFromBoolInner(filter.should, fields, existingMappings);
        }
      } else if (filter.must) {
        if (Array.isArray(filter.must)) {
          filter.must.forEach((clause) => setFieldsFromBoolInner(clause, fields, existingMappings));
        } else {
          setFieldsFromBoolInner(filter.must, fields, existingMappings);
        }
      } else if (filter.must_not) {
        if (Array.isArray(filter.must_not)) {
          filter.must_not.forEach((clause) =>
            setFieldsFromBoolInner(clause, fields, existingMappings)
          );
        } else {
          setFieldsFromBoolInner(filter.must_not, fields, existingMappings);
        }
      } else {
        setFieldsFromBoolInner(filter, fields, existingMappings);
      }
    }
  }

  if (bool.should) {
    if (Array.isArray(bool.should)) {
      bool.should.forEach((clause) => setFieldsFromBoolInner(clause, fields, existingMappings));
    } else {
      setFieldsFromBoolInner(bool.should, fields, existingMappings);
    }
  } else if (bool.must) {
    if (Array.isArray(bool.must)) {
      bool.must.forEach((clause) => setFieldsFromBoolInner(clause, fields, existingMappings));
    } else {
      setFieldsFromBoolInner(bool.must, fields, existingMappings);
    }
  } else if (bool.must_not) {
    if (Array.isArray(bool.must_not)) {
      bool.must_not.forEach((clause) => setFieldsFromBoolInner(clause, fields, existingMappings));
    } else {
      setFieldsFromBoolInner(bool.must_not, fields, existingMappings);
    }
  }
}

function setFieldsFromAggs(aggs, fields, existingMappings) {
  const list = Object.values(aggs);
  for (const agg of list) {
    const keys = Object.keys(agg);

    if (agg.aggs) {
      setFieldsFromAggs(agg.aggs, fields, existingMappings);
    }

    if (agg.range) {
      const rangeField = Object.keys(agg.range)[0];
      setOnFields(fields, rangeField, existingMappings);
    } else {
      for (const key of keys) {
        if (key !== 'aggs' && key !== 'range') {
          setFieldsFromAggInner(agg[key], fields, existingMappings);
        }
      }
    }
  }
}

async function logUsedFields(params, callAsCurrentUser) {
  if (!params || !params.index) {
    return;
  }
  // return;

  // console.log(JSON.stringify(params, null, 2));

  let index = null;
  if (params.index.includes('-es-')) {
    index = 'monitoring-es-*';
  } else if (params.index.includes('-kibana-')) {
    index = 'monitoring-kibana-*';
  } else if (params.index.includes('-beats-')) {
    index = 'monitoring-beats-*';
  } else if (params.index.includes('-logstash-')) {
    index = 'monitoring-logstash-*';
  }

  if (index === null) {
    return;
  }

  fieldCount = 0;

  // Get current mappings
  const mappingsResult = await callAsCurrentUser('transport.request', {
    method: 'GET',
    path: `.${index}/_mapping`,
  });
  const results = Object.values(mappingsResult);
  if (!results || results.length === 0) {
    return;
  }
  const { mappings } = Object.values(mappingsResult)[0];

  const file = `/Users/chris/Desktop/mappings/${index}.json`;
  let mapping = { properties: {} };
  try {
    mapping = JSON.parse(fs.readFileSync(file));
  } catch (err) {}

  // Get off filter path
  // if (params.filterPath) {
  //   const filterPathPrefix = 'hits.hits._source.';
  //   for (const filterPath of params.filterPath) {
  //     if (filterPath.startsWith(filterPathPrefix)) {
  //       const filterPathField = filterPath.substring(filterPathPrefix.length);
  //       setOnFields(mapping.properties, filterPathField, mappings);
  //     }
  //   }
  // }

  if (params.body.sort) {
    console.log('found sort', params.body.sort);
    if (Array.isArray(params.body.sort)) {
      for (const sort of params.body.sort) {
        console.log('keys1', sort, Object.keys(sort));
        setOnFields(mapping.properties, Object.keys(sort)[0], mappings);
      }
    } else {
      console.log('keys2', params.body.sort, Object.keys(params.body.sort));
      setOnFields(mapping.properties, Object.keys(params.body.sort)[0], mappings);
    }
  }

  if (params.body) {
    if (params.body.query) {
      if (params.body.query.bool) {
        setFieldsFromBool(params.body.query.bool, mapping.properties, mappings);
      }
    }
    if (params.body.aggs) {
      setFieldsFromAggs(params.body.aggs, mapping.properties, mappings);
    }
  }

  fs.writeFileSync(file, JSON.stringify(mapping, null, 2));
}

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

    const router = core.http.createRouter();
    this.legacyShimDependencies = {
      router,
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

    const serverInfo = core.http.getServerInfo();
    let kibanaUrl = `${serverInfo.protocol}://${serverInfo.hostname}:${serverInfo.port}`;
    if (core.http.basePath.serverBasePath) {
      kibanaUrl += `/${core.http.basePath.serverBasePath}`;
    }
    const getUiSettingsService = async () => {
      const coreStart = (await core.getStartServices())[0];
      return coreStart.uiSettings;
    };

    const alerts = AlertsFactory.getAll();
    for (const alert of alerts) {
      alert.initializeAlertType(getUiSettingsService, cluster, this.getLogger, config, kibanaUrl);
      plugins.alerts.registerType(alert.getAlertType());
    }

    // Initialize telemetry
    if (plugins.telemetryCollectionManager) {
      registerMonitoringCollection(plugins.telemetryCollectionManager, this.cluster, {
        maxBucketSize: config.ui.max_bucket_size,
        metricbeatIndex: config.ui.metricbeat.index,
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
      requireUIRoutes(this.monitoringCore, {
        router,
        licenseService: this.licenseService,
        encryptedSavedObjects: plugins.encryptedSavedObjects,
      });
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
      alerting: ALERTS,
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
                all: ALERTS,
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
          const legacyRequest: LegacyRequest = {
            ...req,
            logger: this.log,
            getLogger: this.getLogger,
            payload: req.body,
            getKibanaStatsCollector: () => this.legacyShimDependencies.kibanaStatsCollector,
            getUiSettingsService: () => context.core.uiSettings.client,
            getActionTypeRegistry: () => context.actions?.listTypes(),
            getAlertsClient: () => plugins.alerts.getAlertsClientWithRequest(req),
            getActionsClient: () => plugins.actions.getActionsClientWithRequest(req),
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
                      const callAsCurrentUser = client.asScoped(req).callAsCurrentUser;
                      // await logUsedFields(params, callAsCurrentUser);
                      return callAsCurrentUser(endpoint, params);
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
