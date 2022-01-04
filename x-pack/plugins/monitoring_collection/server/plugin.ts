/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'kibana/server';
import { registerMetricsRoute } from './routes';

export interface MonitoringCollectionSetup {
  registerMetric: (metric: Metric) => void;
  getMetrics: () => Promise<Record<string, MetricResult[]>>;
}

// interface PluginDependencySetup {}

// interface PluginDependencyStart {}

export interface MetricResult {
  [key: string]: string | number | undefined;
}

export interface Metric {
  type: string;
  fetch: () => Promise<MetricResult[]>;
}

export class MonitoringCollectionPlugin implements Plugin<MonitoringCollectionSetup, void, {}, {}> {
  private readonly initializerContext: PluginInitializerContext;

  private metrics: Metric[] = [];

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  async getMetrics() {
    const metrics: Record<string, MetricResult[]> = {};
    for (const metric of this.metrics) {
      metrics[metric.type] = await metric.fetch();
    }
    return metrics;
  }

  setup(core: CoreSetup, plugins: {}) {
    const router = core.http.createRouter();
    const kibanaIndex = core.savedObjects.getKibanaIndex();

    registerMetricsRoute({
      router,
      config: {
        allowAnonymous: core.status.isStatusPageAnonymous(),
        kibanaIndex,
        kibanaVersion: this.initializerContext.env.packageInfo.version,
        server: core.http.getServerInfo(),
        uuid: this.initializerContext.env.instanceUuid,
      },
      overallStatus$: core.status.overall$,
      getMetrics: async () => await this.getMetrics(),
    });

    return {
      registerMetric: (metric: Metric) => {
        this.metrics.push(metric);
      },
      getMetrics: async () => await this.getMetrics(),
    };
  }

  start(coreStart: CoreStart, plugins: {}) {}

  stop() {}
}
