/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  Plugin,
  PluginInitializerContext,
  RequestHandlerContext,
} from '@kbn/core/server';
import { MetricsDataClient } from './client';
import { KibanaFramework } from './lib/adapters/framework/kibana_framework_adapter';
import { initMetricIndicesRoute } from './routes/metric_indices';
import { initMetricExplorerRoute } from './routes/metrics_explorer';
import { metricsDataSourceSavedObjectType } from './saved_objects/metrics_data_source';
import { MetricsDataPluginSetup, MetricsDataPluginStartDeps } from './types';

export class MetricsDataPlugin implements Plugin<MetricsDataPluginSetup, {}, {}, {}> {
  private metricsClient: MetricsDataClient | null = null;

  constructor(context: PluginInitializerContext) {}

  public setup(core: CoreSetup<MetricsDataPluginStartDeps>) {
    const router = core.http.createRouter();
    const framework = new KibanaFramework(core, router);

    initMetricExplorerRoute(framework);
    initMetricIndicesRoute<RequestHandlerContext>({
      router,
      metricsClient: new MetricsDataClient(),
    });

    core.savedObjects.registerType(metricsDataSourceSavedObjectType);

    this.metricsClient = new MetricsDataClient();
    return {
      client: this.metricsClient,
    };
  }

  public start() {
    return {};
  }

  public stop() {}
}
