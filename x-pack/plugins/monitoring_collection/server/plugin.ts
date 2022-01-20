/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { CoreSetup, Plugin, PluginInitializerContext } from 'kibana/server';
import { registerRulesRoute } from './routes';

export interface MonitoringCollectionSetup {
  registerMetric: (metric: Metric) => void;
  getMetrics: () => Promise<Record<string, MetricResult | MetricResult[]>>;
}

export type MetricResult = JsonObject;

export interface Metric {
  type: string;
  fetch: () => Promise<MetricResult | MetricResult[]>;
}

export class MonitoringCollectionPlugin implements Plugin<MonitoringCollectionSetup, void, {}, {}> {
  private readonly initializerContext: PluginInitializerContext;

  private metrics: Metric[] = [];

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  async getAllMetrics() {
    const metrics: Record<string, MetricResult | MetricResult[]> = {};
    for (const metric of this.metrics) {
      metrics[metric.type] = await metric.fetch();
    }
    return metrics;
  }

  async getMetrics(type?: string) {
    for (const metric of this.metrics) {
      if (metric.type === type) {
        return await metric.fetch();
      }
    }
  }

  setup(core: CoreSetup) {
    const router = core.http.createRouter();
    const kibanaIndex = core.savedObjects.getKibanaIndex();

    registerRulesRoute({
      router,
      config: {
        allowAnonymous: core.status.isStatusPageAnonymous(),
        kibanaIndex,
        kibanaVersion: this.initializerContext.env.packageInfo.version,
        server: core.http.getServerInfo(),
        uuid: this.initializerContext.env.instanceUuid,
      },
      overallStatus$: core.status.overall$,
      getMetrics: async () => (await this.getMetrics('rule')) as MetricResult[],
    });

    return {
      registerMetric: (metric: Metric) => {
        this.metrics.push(metric);
      },
      getMetrics: async () => await this.getAllMetrics(),
    };
  }

  start() {}

  stop() {}
}
