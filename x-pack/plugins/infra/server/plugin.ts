/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Server } from '@hapi/hapi';
import { schema, TypeOf } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { CoreSetup, Logger, PluginInitializerContext, Plugin } from 'src/core/server';
import { InfraStaticSourceConfiguration } from '../common/source_configuration/source_configuration';
import { inventoryViewSavedObjectType } from '../common/saved_objects/inventory_view';
import { metricsExplorerViewSavedObjectType } from '../common/saved_objects/metrics_explorer_view';
import { LOGS_FEATURE, METRICS_FEATURE } from './features';
import { initInfraServer } from './infra_server';
import { FrameworkFieldsAdapter } from './lib/adapters/fields/framework_fields_adapter';
import { InfraServerPluginSetupDeps, InfraServerPluginStartDeps } from './lib/adapters/framework';
import { KibanaFramework } from './lib/adapters/framework/kibana_framework_adapter';
import { InfraKibanaLogEntriesAdapter } from './lib/adapters/log_entries/kibana_log_entries_adapter';
import { KibanaMetricsAdapter } from './lib/adapters/metrics/kibana_metrics_adapter';
import { InfraElasticsearchSourceStatusAdapter } from './lib/adapters/source_status';
import { registerAlertTypes } from './lib/alerting';
import { InfraFieldsDomain } from './lib/domains/fields_domain';
import { InfraLogEntriesDomain } from './lib/domains/log_entries_domain';
import { InfraMetricsDomain } from './lib/domains/metrics_domain';
import { InfraBackendLibs, InfraDomainLibs } from './lib/infra_types';
import { infraSourceConfigurationSavedObjectType, InfraSources } from './lib/sources';
import { InfraSourceStatus } from './lib/source_status';
import { LogEntriesService } from './services/log_entries';
import { InfraPluginRequestHandlerContext } from './types';
import { UsageCollector } from './usage/usage_collector';
import { createGetLogQueryFields } from './services/log_queries/get_log_query_fields';
import { handleEsError } from '../../../../src/plugins/es_ui_shared/server';
import { initializeAlertClient } from './initialize_alert_client';
import { createLifecycleRuleTypeFactory } from '../../rule_registry/server';

export const config = {
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    inventory: schema.object({
      compositeSize: schema.number({ defaultValue: 2000 }),
    }),
    sources: schema.maybe(
      schema.object({
        default: schema.maybe(
          schema.object({
            logAlias: schema.maybe(schema.string()), // NOTE / TODO: Should be deprecated in 8.0.0
            metricAlias: schema.maybe(schema.string()),
            fields: schema.maybe(
              schema.object({
                timestamp: schema.maybe(schema.string()),
                message: schema.maybe(schema.arrayOf(schema.string())),
                tiebreaker: schema.maybe(schema.string()),
                host: schema.maybe(schema.string()),
                container: schema.maybe(schema.string()),
                pod: schema.maybe(schema.string()),
              })
            ),
          })
        ),
      })
    ),
  }),
};

export type InfraConfig = TypeOf<typeof config.schema>;

export interface KbnServer extends Server {
  usage: any;
}

const logsSampleDataLinkLabel = i18n.translate('xpack.infra.sampleDataLinkLabel', {
  defaultMessage: 'Logs',
});

export interface InfraPluginSetup {
  defineInternalSourceConfiguration: (
    sourceId: string,
    sourceProperties: InfraStaticSourceConfiguration
  ) => void;
}

export class InfraServerPlugin implements Plugin<InfraPluginSetup> {
  public config: InfraConfig;
  public libs: InfraBackendLibs | undefined;
  public logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.config = context.config.get<InfraConfig>();
  }

  setup(core: CoreSetup<InfraServerPluginStartDeps>, plugins: InfraServerPluginSetupDeps) {
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

    // register saved object types
    core.savedObjects.registerType(infraSourceConfigurationSavedObjectType);
    core.savedObjects.registerType(metricsExplorerViewSavedObjectType);
    core.savedObjects.registerType(inventoryViewSavedObjectType);

    // TODO: separate these out individually and do away with "domains" as a temporary group
    // and make them available via the request context so we can do away with
    // the wrapper classes
    const domainLibs: InfraDomainLibs = {
      fields: new InfraFieldsDomain(new FrameworkFieldsAdapter(framework), {
        sources,
      }),
      logEntries: new InfraLogEntriesDomain(new InfraKibanaLogEntriesAdapter(framework), {
        framework,
        sources,
      }),
      metrics: new InfraMetricsDomain(new KibanaMetricsAdapter(framework)),
    };

    const logsAlertClient = initializeAlertClient({
      name: 'logs',
      getStartServices: core.getStartServices,
      plugins,
      logger: this.logger,
    });

    const metricsAlertClient = initializeAlertClient({
      name: 'metrics',
      getStartServices: core.getStartServices,
      plugins,
      logger: this.logger,
    });

    this.libs = {
      configuration: this.config,
      framework,
      sources,
      sourceStatus,
      ...domainLibs,
      getLogQueryFields: createGetLogQueryFields(sources, framework),
      handleEsError,
      logsAlertClient,
      createLogsLifecycleRuleType: createLifecycleRuleTypeFactory({
        ruleDataClient: logsAlertClient,
        logger: this.logger,
      }),
      metricsAlertClient,
      createMetricsLifecycleRuleType: createLifecycleRuleTypeFactory({
        ruleDataClient: metricsAlertClient,
        logger: this.logger,
      }),
    };

    plugins.features.registerKibanaFeature(METRICS_FEATURE);
    plugins.features.registerKibanaFeature(LOGS_FEATURE);

    plugins.home.sampleData.addAppLinksToSampleDataset('logs', [
      {
        path: `/app/logs`,
        label: logsSampleDataLinkLabel,
        icon: 'logsApp',
      },
    ]);

    initInfraServer(this.libs);
    registerAlertTypes(plugins.alerting, this.libs, plugins.ml);

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
    logEntriesService.setup(core, { ...plugins, sources });

    return {
      defineInternalSourceConfiguration(sourceId, sourceProperties) {
        sources.defineInternalSourceConfiguration(sourceId, sourceProperties);
      },
    } as InfraPluginSetup;
  }

  start() {}
  stop() {}
}
