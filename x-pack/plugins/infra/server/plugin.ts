/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Server } from '@hapi/hapi';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { Logger } from '@kbn/logging';
import {
  CoreStart,
  Plugin,
  PluginConfigDescriptor,
  PluginInitializerContext,
} from 'src/core/server';
import { handleEsError } from '../../../../src/plugins/es_ui_shared/server';
import { LOGS_FEATURE_ID, METRICS_FEATURE_ID } from '../common/constants';
import { defaultLogViewsStaticConfig } from '../common/log_views';
import { publicConfigKeys } from '../common/plugin_config_types';
import { inventoryViewSavedObjectType } from '../common/saved_objects/inventory_view';
import { metricsExplorerViewSavedObjectType } from '../common/saved_objects/metrics_explorer_view';
import { configDeprecations, getInfraDeprecationsFactory } from './deprecations';
import { LOGS_FEATURE, METRICS_FEATURE } from './features';
import { initInfraServer } from './infra_server';
import { FrameworkFieldsAdapter } from './lib/adapters/fields/framework_fields_adapter';
import { InfraServerPluginSetupDeps, InfraServerPluginStartDeps } from './lib/adapters/framework';
import { KibanaFramework } from './lib/adapters/framework/kibana_framework_adapter';
import { InfraKibanaLogEntriesAdapter } from './lib/adapters/log_entries/kibana_log_entries_adapter';
import { KibanaMetricsAdapter } from './lib/adapters/metrics/kibana_metrics_adapter';
import { InfraElasticsearchSourceStatusAdapter } from './lib/adapters/source_status';
import { registerRuleTypes } from './lib/alerting';
import { InfraFieldsDomain } from './lib/domains/fields_domain';
import { InfraLogEntriesDomain } from './lib/domains/log_entries_domain';
import { InfraMetricsDomain } from './lib/domains/metrics_domain';
import { InfraBackendLibs, InfraDomainLibs } from './lib/infra_types';
import { infraSourceConfigurationSavedObjectType, InfraSources } from './lib/sources';
import { InfraSourceStatus } from './lib/source_status';
import { logViewSavedObjectType } from './saved_objects';
import { LogEntriesService } from './services/log_entries';
import { LogViewsService } from './services/log_views';
import { RulesService } from './services/rules';
import {
  InfraConfig,
  InfraPluginCoreSetup,
  InfraPluginRequestHandlerContext,
  InfraPluginSetup,
  InfraPluginStart,
} from './types';
import { UsageCollector } from './usage/usage_collector';

export const config: PluginConfigDescriptor<InfraConfig> = {
  schema: schema.object({
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
  private logViews: LogViewsService;

  constructor(context: PluginInitializerContext<InfraConfig>) {
    this.config = context.config.get();
    this.logger = context.logger.get();

    this.logsRules = new RulesService(
      LOGS_FEATURE_ID,
      'observability.logs',
      this.logger.get('logsRules')
    );
    this.metricsRules = new RulesService(
      METRICS_FEATURE_ID,
      'observability.metrics',
      this.logger.get('metricsRules')
    );

    this.logViews = new LogViewsService(this.logger.get('logViews'));
  }

  setup(core: InfraPluginCoreSetup, plugins: InfraServerPluginSetupDeps) {
    const framework = new KibanaFramework(core, this.config, plugins);
    const sources = new InfraSources({
      config: this.config,
    });
    const sourceStatus = new InfraSourceStatus(
      new InfraElasticsearchSourceStatusAdapter(framework),
      {
        sources,
      }
    );
    const logViews = this.logViews.setup();

    // register saved object types
    core.savedObjects.registerType(infraSourceConfigurationSavedObjectType);
    core.savedObjects.registerType(metricsExplorerViewSavedObjectType);
    core.savedObjects.registerType(inventoryViewSavedObjectType);
    core.savedObjects.registerType(logViewSavedObjectType);

    // TODO: separate these out individually and do away with "domains" as a temporary group
    // and make them available via the request context so we can do away with
    // the wrapper classes
    const domainLibs: InfraDomainLibs = {
      fields: new InfraFieldsDomain(new FrameworkFieldsAdapter(framework), {
        sources,
      }),
      logEntries: new InfraLogEntriesDomain(new InfraKibanaLogEntriesAdapter(framework), {
        framework,
        getStartServices: () => core.getStartServices(),
      }),
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
      logger: this.logger,
      basePath: core.http.basePath,
    };

    plugins.features.registerKibanaFeature(METRICS_FEATURE);
    plugins.features.registerKibanaFeature(LOGS_FEATURE);

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
      (context, request) => {
        const mlSystem = plugins.ml?.mlSystemProvider(request, context.core.savedObjects.client);
        const mlAnomalyDetectors = plugins.ml?.anomalyDetectorsProvider(
          request,
          context.core.savedObjects.client
        );
        const spaceId = plugins.spaces?.spacesService.getSpaceId(request) || 'default';

        return {
          mlAnomalyDetectors,
          mlSystem,
          spaceId,
        };
      }
    );

    // Telemetry
    UsageCollector.registerUsageCollector(plugins.usageCollection);

    const logEntriesService = new LogEntriesService();
    logEntriesService.setup(core, plugins);

    // register deprecated source configuration fields
    core.deprecations.registerDeprecations({
      getDeprecations: getInfraDeprecationsFactory(sources),
    });

    return {
      defineInternalSourceConfiguration: sources.defineInternalSourceConfiguration.bind(sources),
      logViews,
    } as InfraPluginSetup;
  }

  start(core: CoreStart, plugins: InfraServerPluginStartDeps) {
    const logViews = this.logViews.start({
      infraSources: this.libs.sources,
      savedObjects: core.savedObjects,
      dataViews: plugins.dataViews,
      elasticsearch: core.elasticsearch,
      config: {
        messageFields:
          this.config.sources?.default?.fields?.message ??
          defaultLogViewsStaticConfig.messageFields,
      },
    });

    return {
      logViews,
    };
  }
  stop() {}
}
