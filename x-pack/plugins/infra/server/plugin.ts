/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, PluginInitializerContext } from 'src/core/server';
import { Server } from 'hapi';
import { Observable } from 'rxjs';
import { schema, TypeOf } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { initInfraServer } from './infra_server';
import { InfraBackendLibs, InfraDomainLibs } from './lib/infra_types';
import { FrameworkFieldsAdapter } from './lib/adapters/fields/framework_fields_adapter';
import { KibanaFramework } from './lib/adapters/framework/kibana_framework_adapter';
import { InfraKibanaLogEntriesAdapter } from './lib/adapters/log_entries/kibana_log_entries_adapter';
import { KibanaMetricsAdapter } from './lib/adapters/metrics/kibana_metrics_adapter';
import { InfraElasticsearchSourceStatusAdapter } from './lib/adapters/source_status';
import { InfraFieldsDomain } from './lib/domains/fields_domain';
import { InfraLogEntriesDomain } from './lib/domains/log_entries_domain';
import { InfraMetricsDomain } from './lib/domains/metrics_domain';
import { InfraSnapshot } from './lib/snapshot';
import { InfraSourceStatus } from './lib/source_status';
import { InfraSources } from './lib/sources';
import { InfraServerPluginDeps } from './lib/adapters/framework';
import { METRICS_FEATURE, LOGS_FEATURE } from './features';
import { UsageCollector } from './usage/usage_collector';
import { InfraStaticSourceConfiguration } from '../common/http_api/source_api';
import { registerAlertTypes } from './lib/alerting';
import { infraSourceConfigurationSavedObjectType } from './lib/sources';
import { metricsExplorerViewSavedObjectType } from '../common/saved_objects/metrics_explorer_view';
import { inventoryViewSavedObjectType } from '../common/saved_objects/inventory_view';
import { InfraRequestHandlerContext } from './types';

export const config = {
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    query: schema.object({
      partitionSize: schema.number({ defaultValue: 75 }),
      partitionFactor: schema.number({ defaultValue: 1.2 }),
    }),
    sources: schema.maybe(
      schema.object({
        default: schema.maybe(
          schema.object({
            logAlias: schema.maybe(schema.string()),
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

export class InfraServerPlugin {
  private config$: Observable<InfraConfig>;
  public config = {} as InfraConfig;
  public libs: InfraBackendLibs | undefined;

  constructor(context: PluginInitializerContext) {
    this.config$ = context.config.create<InfraConfig>();
  }

  async setup(core: CoreSetup, plugins: InfraServerPluginDeps) {
    await new Promise((resolve) => {
      this.config$.subscribe((configValue) => {
        this.config = configValue;
        resolve();
      });
    });
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
    const snapshot = new InfraSnapshot();

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

    this.libs = {
      configuration: this.config,
      framework,
      snapshot,
      sources,
      sourceStatus,
      ...domainLibs,
    };

    plugins.features.registerFeature(METRICS_FEATURE);
    plugins.features.registerFeature(LOGS_FEATURE);

    plugins.home.sampleData.addAppLinksToSampleDataset('logs', [
      {
        path: `/app/logs`,
        label: logsSampleDataLinkLabel,
        icon: 'logsApp',
      },
    ]);

    initInfraServer(this.libs);
    registerAlertTypes(plugins.alerts, this.libs);

    core.http.registerRouteHandlerContext(
      'infra',
      (context, request): InfraRequestHandlerContext => {
        const mlSystem = context.ml && plugins.ml?.mlSystemProvider(context.ml?.mlClient, request);
        const mlAnomalyDetectors =
          context.ml && plugins.ml?.anomalyDetectorsProvider(context.ml?.mlClient, request);
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

    return {
      defineInternalSourceConfiguration(sourceId, sourceProperties) {
        sources.defineInternalSourceConfiguration(sourceId, sourceProperties);
      },
    } as InfraPluginSetup;
  }

  start() {}
  stop() {}
}
