/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import { Logger } from '@kbn/logging';
import { MetricsDataPluginClass } from './types';
import { MetricsDataClient } from './lib/metrics_client';
import { createLazyContainerMetricsTable } from './components/infrastructure_node_metrics_tables/container/create_lazy_container_metrics_table';
import { createLazyHostMetricsTable } from './components/infrastructure_node_metrics_tables/host/create_lazy_host_metrics_table';
import { createLazyPodMetricsTable } from './components/infrastructure_node_metrics_tables/pod/create_lazy_pod_metrics_table';

export class Plugin implements MetricsDataPluginClass {
  public logger: Logger;

  constructor(context: PluginInitializerContext<{}>) {
    this.logger = context.logger.get();
  }

  setup(core: CoreSetup) {
    const metricsClient = new MetricsDataClient(core.http);
    return {
      metricsClient,
    };
  }

  start(core: CoreStart) {
    const metricsClient = new MetricsDataClient(core.http);
    return {
      metricsClient,
      ContainerMetricsTable: createLazyContainerMetricsTable(core, metricsClient),
      HostMetricsTable: createLazyHostMetricsTable(core, metricsClient),
      PodMetricsTable: createLazyPodMetricsTable(core, metricsClient),
    };
  }

  stop() {}
}
