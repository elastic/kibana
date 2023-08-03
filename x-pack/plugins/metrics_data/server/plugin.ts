/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { Logger } from '@kbn/logging';
import { getInfraDeprecationsFactory } from './deprecations';
import { initInfraServer } from './infra_server';
import { FrameworkFieldsAdapter } from './lib/adapters/fields/framework_fields_adapter';
import { InfraServerPluginSetupDeps, InfraServerPluginStartDeps } from './lib/adapters/framework';
import { KibanaFramework } from './lib/adapters/framework/kibana_framework_adapter';
import { InfraElasticsearchSourceStatusAdapter } from './lib/adapters/source_status';
import { InfraFieldsDomain } from './lib/domains/fields_domain';
import { MetricsDataBackendLibs } from './lib/metrics_data_types';
import { makeGetMetricIndices } from './lib/metrics/make_get_metric_indices';
import { infraSourceConfigurationSavedObjectType } from './saved_objects/infra_source_configuration';
import { InfraSources } from './lib/sources';
import { InfraSourceStatus } from './lib/source_status';
import { InfraPluginCoreSetup, MetricsDataPluginSetup, MetricsDataPluginStart } from './types';

export class MetricsDataServerPlugin
  implements
    Plugin<
      MetricsDataPluginSetup,
      MetricsDataPluginStart,
      InfraServerPluginSetupDeps,
      InfraServerPluginStartDeps
    >
{
  public libs!: MetricsDataBackendLibs;
  public logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(core: InfraPluginCoreSetup, plugins: InfraServerPluginSetupDeps) {
    const framework = new KibanaFramework(core, plugins);
    const sources = new InfraSources();
    const sourceStatus = new InfraSourceStatus(
      new InfraElasticsearchSourceStatusAdapter(framework),
      { sources }
    );

    // Register saved object types
    core.savedObjects.registerType(infraSourceConfigurationSavedObjectType);

    this.libs = {
      framework,
      sources,
      sourceStatus,
      logger: this.logger,
      basePath: core.http.basePath,
      fields: new InfraFieldsDomain(new FrameworkFieldsAdapter(framework), {
        sources,
      }),
    };

    initInfraServer(this.libs);

    // register deprecated source configuration fields
    core.deprecations.registerDeprecations({
      getDeprecations: getInfraDeprecationsFactory(sources),
    });

    return {
      getClient: () => new InfraSources(),
    } as MetricsDataPluginSetup;
  }

  start(core: CoreStart) {
    return {
      getMetricIndices: makeGetMetricIndices(this.libs.sources),
    };
  }

  stop() {}
}
