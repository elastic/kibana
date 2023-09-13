/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Server } from '@hapi/hapi';
import { offeringBasedSchema, schema } from '@kbn/config-schema';
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
import {
  DISCOVER_APP_TARGET,
  LOGS_APP_TARGET,
  LOGS_FEATURE_ID,
  METRICS_FEATURE_ID,
} from '../common/constants';
import { publicConfigKeys } from '../common/plugin_config_types';
import { configDeprecations, getInfraDeprecationsFactory } from './deprecations';
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
import { makeGetMetricIndices } from './lib/metrics/make_get_metric_indices';
import { infraSourceConfigurationSavedObjectType, InfraSources } from './lib/sources';
import { InfraSourceStatus } from './lib/source_status';
import { inventoryViewSavedObjectType, metricsExplorerViewSavedObjectType } from './saved_objects';
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
    // Setting variants only allowed in the Serverless offering, otherwise always default `logs-ui` value
    logs: offeringBasedSchema({
      serverless: schema.object({
        app_target: schema.oneOf(
          [schema.literal(LOGS_APP_TARGET), schema.literal(DISCOVER_APP_TARGET)],
          { defaultValue: LOGS_APP_TARGET }
        ),
      }),
      options: {
        defaultValue: { app_target: LOGS_APP_TARGET } as const, // "as const" is required for TS to not generalize `app_target: string`
      },
    }),
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
  }),
  deprecations: configDeprecations,
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
  private metricsExplorerViews: MetricsExplorerViewsService;

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
    this.metricsExplorerViews = new MetricsExplorerViewsService(
      this.logger.get('metricsExplorerViews')
    );
  }

  setup(core: InfraPluginCoreSetup, plugins: InfraServerPluginSetupDeps) {
    const framework = new KibanaFramework(core, this.config, plugins);
    const sources = new InfraSources({
      config: this.config,
    });
    const sourceStatus = new InfraSourceStatus(
      new InfraElasticsearchSourceStatusAdapter(framework),
      { sources }
    );

    // Setup infra services
    const inventoryViews = this.inventoryViews.setup();
    const metricsExplorerViews = this.metricsExplorerViews.setup();

    // Register saved object types
    core.savedObjects.registerType(infraSourceConfigurationSavedObjectType);
    core.savedObjects.registerType(inventoryViewSavedObjectType);
    core.savedObjects.registerType(metricsExplorerViewSavedObjectType);

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
      const sourceConfiguration = await sources.getSourceConfiguration(soClient, sourceId);
      return mapSourceToLogView(sourceConfiguration);
    });
    plugins.logsShared.logViews.setLogViewsStaticConfig({
      messageFields: this.config.sources?.default?.fields?.message,
    });

    plugins.logsShared.registerUsageCollectorActions({
      countLogs: () => UsageCollector.countLogs(),
    });

    plugins.home.sampleData.addAppLinksToSampleDataset('logs', [
      {
        sampleObject: null, // indicates that there is no sample object associated with this app link's path
        getPath: () => `/app/logs`,
        label: logsSampleDataLinkLabel,
        icon: 'logsApp',
      },
    ]);

    initInfraServer(this.libs);
    registerRuleTypes(plugins.alerting, this.libs, plugins.ml);

    core.http.registerRouteHandlerContext<InfraPluginRequestHandlerContext, 'infra'>(
      'infra',
      async (context, request) => {
        const soClient = (await context.core).savedObjects.client;
        const mlSystem = plugins.ml?.mlSystemProvider(request, soClient);
        const mlAnomalyDetectors = plugins.ml?.anomalyDetectorsProvider(request, soClient);
        const spaceId = plugins.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;

        return {
          mlAnomalyDetectors,
          mlSystem,
          spaceId,
        };
      }
    );

    // Telemetry
    UsageCollector.registerUsageCollector(plugins.usageCollection);

    // register deprecated source configuration fields
    core.deprecations.registerDeprecations({
      getDeprecations: getInfraDeprecationsFactory(sources),
    });

    return {
      defineInternalSourceConfiguration: sources.defineInternalSourceConfiguration.bind(sources),
      inventoryViews,
      metricsExplorerViews,
    } as InfraPluginSetup;
  }

  start(core: CoreStart) {
    const inventoryViews = this.inventoryViews.start({
      infraSources: this.libs.sources,
      savedObjects: core.savedObjects,
    });

    const metricsExplorerViews = this.metricsExplorerViews.start({
      infraSources: this.libs.sources,
      savedObjects: core.savedObjects,
    });

    return {
      inventoryViews,
      metricsExplorerViews,
      getMetricIndices: makeGetMetricIndices(this.libs.sources),
    };
  }

  stop() {}
}
