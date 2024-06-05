/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Server } from '@hapi/hapi';
import { schema, offeringBasedSchema } from '@kbn/config-schema';
import {
  CoreStart,
  Plugin,
  PluginConfigDescriptor,
  PluginInitializerContext,
} from '@kbn/core/server';
import { handleEsError } from '@kbn/es-ui-shared-plugin/server';
import { i18n } from '@kbn/i18n';
import { Logger } from '@kbn/logging';
import { alertsLocatorID } from '@kbn/observability-plugin/common';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { GetMetricIndicesOptions } from '@kbn/metrics-data-access-plugin/server';
import { LOGS_FEATURE_ID, METRICS_FEATURE_ID } from '../common/constants';
import { publicConfigKeys } from '../common/plugin_config_types';
import { LOGS_FEATURE, METRICS_FEATURE } from './features';
import { initInfraServer } from './infra_server';
import { FrameworkFieldsAdapter } from './lib/adapters/fields/framework_fields_adapter';
import { InfraServerPluginSetupDeps, InfraServerPluginStartDeps } from './lib/adapters/framework';
import { KibanaFramework } from './lib/adapters/framework/kibana_framework_adapter';
import { KibanaMetricsAdapter } from './lib/adapters/metrics/kibana_metrics_adapter';
import { InfraElasticsearchSourceStatusAdapter } from './lib/adapters/source_status';
import { registerRuleTypes } from './lib/alerting';
import {
  LOGS_RULES_ALERT_CONTEXT,
  METRICS_RULES_ALERT_CONTEXT,
} from './lib/alerting/register_rule_types';
import { InfraFieldsDomain } from './lib/domains/fields_domain';
import { InfraMetricsDomain } from './lib/domains/metrics_domain';
import { InfraBackendLibs, InfraDomainLibs } from './lib/infra_types';
import { infraSourceConfigurationSavedObjectType, InfraSources } from './lib/sources';
import { InfraSourceStatus } from './lib/source_status';
import {
  infraCustomDashboardsSavedObjectType,
  inventoryViewSavedObjectType,
  metricsExplorerViewSavedObjectType,
} from './saved_objects';
import { InventoryViewsService } from './services/inventory_views';
import { MetricsExplorerViewsService } from './services/metrics_explorer_views';
import { RulesService } from './services/rules';
import {
  InfraConfig,
  InfraPluginCoreSetup,
  InfraPluginRequestHandlerContext,
  InfraPluginSetup,
  InfraPluginStart,
} from './types';
import { UsageCollector } from './usage/usage_collector';
import { mapSourceToLogView } from './utils/map_source_to_log_view';

export const config: PluginConfigDescriptor<InfraConfig> = {
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    alerting: schema.object({
      inventory_threshold: schema.object({
        group_by_page_size: schema.number({ defaultValue: 5_000 }),
      }),
      metric_threshold: schema.object({
        group_by_page_size: schema.number({ defaultValue: 10_000 }),
      }),
    }),
    inventory: schema.object({
      compositeSize: schema.number({ defaultValue: 2000 }),
    }),
    sources: schema.maybe(
      schema.object({
        default: schema.maybe(
          schema.object({
            fields: schema.maybe(
              schema.object({
                message: schema.maybe(schema.arrayOf(schema.string())),
              })
            ),
          })
        ),
      })
    ),
    featureFlags: schema.object({
      customThresholdAlertsEnabled: offeringBasedSchema({
        traditional: schema.boolean({ defaultValue: false }),
        serverless: schema.boolean({ defaultValue: false }),
      }),
      logsUIEnabled: offeringBasedSchema({
        traditional: schema.boolean({ defaultValue: true }),
        serverless: schema.boolean({ defaultValue: false }),
      }),
      metricsExplorerEnabled: offeringBasedSchema({
        traditional: schema.boolean({ defaultValue: true }),
        serverless: schema.boolean({ defaultValue: false }),
      }),
      osqueryEnabled: schema.boolean({ defaultValue: true }),
      inventoryThresholdAlertRuleEnabled: offeringBasedSchema({
        traditional: schema.boolean({ defaultValue: true }),
        serverless: schema.boolean({ defaultValue: true }),
      }),
      metricThresholdAlertRuleEnabled: offeringBasedSchema({
        traditional: schema.boolean({ defaultValue: true }),
        serverless: schema.boolean({ defaultValue: false }),
      }),
      logThresholdAlertRuleEnabled: offeringBasedSchema({
        traditional: schema.boolean({ defaultValue: true }),
        serverless: schema.boolean({ defaultValue: false }),
      }),
      alertsAndRulesDropdownEnabled: offeringBasedSchema({
        traditional: schema.boolean({ defaultValue: true }),
        serverless: schema.boolean({ defaultValue: true }),
      }),
      /**
       * Depends on optional "profilingDataAccess" and "profiling"
       * plugins. Enable both with `xpack.profiling.enabled: true` before
       * enabling this feature flag.
       */
      profilingEnabled: schema.boolean({ defaultValue: false }),
      ruleFormV2Enabled: schema.boolean({ defaultValue: false }),
    }),
  }),
  exposeToBrowser: publicConfigKeys,
};

export type { InfraConfig };

export interface KbnServer extends Server {
  usage: any;
}

const logsSampleDataLinkLabel = i18n.translate('xpack.infra.sampleDataLinkLabel', {
  defaultMessage: 'Logs',
});

export class InfraServerPlugin
  implements
    Plugin<
      InfraPluginSetup,
      InfraPluginStart,
      InfraServerPluginSetupDeps,
      InfraServerPluginStartDeps
    >
{
  public config: InfraConfig;
  public libs!: InfraBackendLibs;
  public logger: Logger;

  private logsRules: RulesService;
  private metricsRules: RulesService;
  private inventoryViews: InventoryViewsService;
  private metricsExplorerViews?: MetricsExplorerViewsService;

  constructor(context: PluginInitializerContext<InfraConfig>) {
    this.config = context.config.get();
    this.logger = context.logger.get();

    this.logsRules = new RulesService(
      LOGS_FEATURE_ID,
      LOGS_RULES_ALERT_CONTEXT,
      this.logger.get('logsRules')
    );
    this.metricsRules = new RulesService(
      METRICS_FEATURE_ID,
      METRICS_RULES_ALERT_CONTEXT,
      this.logger.get('metricsRules')
    );

    this.inventoryViews = new InventoryViewsService(this.logger.get('inventoryViews'));
    this.metricsExplorerViews = this.config.featureFlags.metricsExplorerEnabled
      ? new MetricsExplorerViewsService(this.logger.get('metricsExplorerViews'))
      : undefined;
  }

  setup(core: InfraPluginCoreSetup, plugins: InfraServerPluginSetupDeps) {
    const framework = new KibanaFramework(core, this.config, plugins);
    const metricsClient = plugins.metricsDataAccess.client;
    const getApmIndices = plugins.apmDataAccess.getApmIndices;
    metricsClient.setDefaultMetricIndicesHandler(async (options: GetMetricIndicesOptions) => {
      const sourceConfiguration = await sources.getInfraSourceConfiguration(
        options.savedObjectsClient,
        'default'
      );
      return sourceConfiguration.configuration.metricAlias;
    });
    const sources = new InfraSources({
      config: this.config,
      metricsClient,
    });
    const sourceStatus = new InfraSourceStatus(
      new InfraElasticsearchSourceStatusAdapter(framework),
      { sources }
    );

    // Setup infra services
    const inventoryViews = this.inventoryViews.setup();
    const metricsExplorerViews = this.metricsExplorerViews?.setup();

    // Register saved object types
    core.savedObjects.registerType(infraSourceConfigurationSavedObjectType);
    core.savedObjects.registerType(inventoryViewSavedObjectType);
    core.savedObjects.registerType(infraCustomDashboardsSavedObjectType);
    if (this.config.featureFlags.metricsExplorerEnabled) {
      core.savedObjects.registerType(metricsExplorerViewSavedObjectType);
    }

    // TODO: separate these out individually and do away with "domains" as a temporary group
    // and make them available via the request context so we can do away with
    // the wrapper classes
    const domainLibs: InfraDomainLibs = {
      fields: new InfraFieldsDomain(new FrameworkFieldsAdapter(framework), {
        sources,
      }),
      logEntries: plugins.logsShared.logEntries,
      metrics: new InfraMetricsDomain(new KibanaMetricsAdapter(framework)),
    };

    this.libs = {
      configuration: this.config,
      framework,
      sources,
      sourceStatus,
      metricsClient,
      getApmIndices,
      ...domainLibs,
      handleEsError,
      logsRules: this.logsRules.setup(core, plugins),
      metricsRules: this.metricsRules.setup(core, plugins),
      getStartServices: () => core.getStartServices(),
      getAlertDetailsConfig: () => plugins.observability.getAlertDetailsConfig(),
      logger: this.logger,
      basePath: core.http.basePath,
      alertsLocator: plugins.share.url.locators.get(alertsLocatorID),
    };

    plugins.features.registerKibanaFeature(METRICS_FEATURE);
    plugins.features.registerKibanaFeature(LOGS_FEATURE);

    // Register an handler to retrieve the fallback logView starting from a source configuration
    plugins.logsShared.logViews.registerLogViewFallbackHandler(async (sourceId, { soClient }) => {
      const sourceConfiguration = await sources.getInfraSourceConfiguration(soClient, sourceId);
      return mapSourceToLogView(sourceConfiguration);
    });
    plugins.logsShared.logViews.setLogViewsStaticConfig({
      messageFields: this.config.sources?.default?.fields?.message,
    });

    plugins.logsShared.registerUsageCollectorActions({
      countLogs: () => UsageCollector.countLogs(),
    });

    if (this.config.featureFlags.logsUIEnabled) {
      plugins.home.sampleData.addAppLinksToSampleDataset('logs', [
        {
          sampleObject: null, // indicates that there is no sample object associated with this app link's path
          getPath: () => `/app/logs`,
          label: logsSampleDataLinkLabel,
          icon: 'logsApp',
        },
      ]);
    }

    registerRuleTypes(plugins.alerting, this.libs, this.config);

    const detectionRouter = core.http.createRouter();
    detectionRouter.post(
      {
        path: '/api/observability/detections',
        validate: {
          body: schema.object({}, { unknowns: 'allow' }),
        },
        options: { authRequired: false },
      },
      async (context, request, response) => {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;

        const hostName = request.body.hostName;

        // get the agent.id of data shipped from the host
        const agentId = await esClient
          .search({
            index: 'logs-*',
            body: {
              query: {
                bool: {
                  filter: [
                    {
                      term: {
                        'host.hostname': hostName,
                      },
                    },
                  ],
                },
              },
              size: 1,
              _source: ['agent.id'],
            },
          })
          .then((res) => {
            return (res.hits.hits[0]._source as any).agent.id;
          });

        console.log('agentId:', agentId);

        // get the detections for the agent.id
        const detections = await esClient
          .search({
            index: 'logs-edgedetections-*',
            body: {
              query: {
                bool: {
                  filter: [
                    {
                      term: {
                        'agent.id': agentId,
                      },
                    },
                  ],
                },
              },
              sort: [{ '@timestamp': 'desc' }],
              size: 100,
            },
          })
          .then((res) => {
            return res.hits.hits.map((hit) => hit._source);
          });

        // detections look like this:
        /*
          [
    {
      "agent.id": "08506667-7423-4a4b-a58f-c3030da6f8ae",
      "detection": {
        "package": "apache",
        "paths": [
          "/var/log/apache2/error.log",
          "/var/log/apache2/other_vhosts_access.log",
          "/var/log/apache2/access.log",
          "/var/log/apache2/error.log",
          "/var/log/apache2/other_vhosts_access.log",
          "/var/log/apache2/access.log",
          "/var/log/apache2/error.log",
          "/var/log/apache2/other_vhosts_access.log",
          "/var/log/apache2/access.log"
        ]
      },
      "@timestamp": "2024-06-04T12:57:51.407305Z"
    },
    {
      "agent.id": "08506667-7423-4a4b-a58f-c3030da6f8ae",
      "detection": {
        "package": "custom",
        "paths": [
          "/run/log/journal/6e276c66949342438fbf8ac981c92628/system.journal",
          "/var/log/auth.log",
          "/var/log/user.log",
          "/var/log/syslog",
          "/var/log/messages",
          "/var/log/daemon.log",
          "/var/log/lightdm/lightdm.log",
          "/var/log/lightdm/x-0.log",
          "/var/log/lightdm/x-0.log",
          "/var/log/Xorg.0.log",
          "/run/user/1000/i3/errorlog.715",
          "/opt/Elastic/Agent/data/elastic-agent-8.15.0-SNAPSHOT-e984ed/logs/elastic-agent-20240604-7.ndjson",
          "/opt/Elastic/Agent/data/elastic-agent-8.15.0-SNAPSHOT-e984ed/run/log-default/registry/filebeat/log.json",
          "/opt/Elastic/Agent/data/elastic-agent-8.15.0-SNAPSHOT-e984ed/logs/elastic-agent-20240604-7.ndjson",
          "/opt/Elastic/Agent/data/elastic-agent-8.15.0-SNAPSHOT-e984ed/run/filestream-monitoring/registry/filebeat/log.json"
        ]
      },
      */
        // we need to extract all the paths, then check whether we already ingest these logs by querying logs with log.file.path
        // then we can filter the detections by the logs we already ingest

        const paths = detections.flatMap((detection) => detection.detection.paths);
        console.log('paths:', paths);

        const logs = await esClient.search({
          index: 'logs-*',
          body: {
            query: {
              bool: {
                filter: [
                  {
                    terms: {
                      'log.file.path': paths,
                    },
                  },
                  {
                    term: {
                      'host.hostname': hostName,
                    },
                  },
                ],
              },
            },
            aggs: {
              paths: {
                terms: {
                  field: 'log.file.path',
                  size: 10000,
                },
              },
            },
            size: 0,
          },
        });

        console.log('logs:', logs);

        const ingestedPaths = logs.aggregations.paths.buckets.map((bucket) => bucket.key);

        console.log('ingestedPaths:', ingestedPaths);

        const filteredDetections = detections
          .map((detection) => ({
            ...detection,
            detection: {
              ...detection.detection,
              paths: detection.detection.paths.filter((path) => !ingestedPaths.includes(path)),
            },
          }))
          .filter((detection) => detection.detection.paths.length > 0);

        return response.ok({
          body: {
            params: request.body,
            results: filteredDetections,
          },
        });
      }
    );

    core.http.registerRouteHandlerContext<InfraPluginRequestHandlerContext, 'infra'>(
      'infra',
      async (context, request) => {
        const coreContext = await context.core;
        const savedObjectsClient = coreContext.savedObjects.client;
        const uiSettingsClient = coreContext.uiSettings.client;
        const mlSystem = plugins.ml?.mlSystemProvider(request, savedObjectsClient);
        const mlAnomalyDetectors = plugins.ml?.anomalyDetectorsProvider(
          request,
          savedObjectsClient
        );
        const spaceId = plugins.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;

        return {
          mlAnomalyDetectors,
          mlSystem,
          spaceId,
          savedObjectsClient,
          uiSettingsClient,
        };
      }
    );

    // Telemetry
    UsageCollector.registerUsageCollector(plugins.usageCollection);

    return {
      inventoryViews,
      metricsExplorerViews,
    } as InfraPluginSetup;
  }

  start(core: CoreStart, pluginsStart: InfraServerPluginStartDeps) {
    const inventoryViews = this.inventoryViews.start({
      infraSources: this.libs.sources,
      savedObjects: core.savedObjects,
    });

    const metricsExplorerViews = this.metricsExplorerViews?.start({
      infraSources: this.libs.sources,
      savedObjects: core.savedObjects,
    });

    initInfraServer(this.libs, core, pluginsStart);

    return {
      inventoryViews,
      metricsExplorerViews,
    };
  }

  stop() {}
}
