/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from 'kibana/server';
import { configSchema, createConfig, MonitoringCollectionConfig } from './config';
import { registerMetricsRoute } from './routes';

export interface MonitoringCollectionSetup {
  registerMetric: (metric: Metric) => void;
  getMetrics: () => Promise<Record<string, MetricResult[]>>;
}

// interface PluginDependencySetup {}

// interface PluginDependencyStart {}

const LOGGING_TAG = 'monitoring_collection';

export interface MetricResult {
  [key: string]: string | number | undefined;
}

export interface Metric {
  type: string;
  fetch: () => Promise<MetricResult[]>;
}

export class MonitoringCollectionPlugin implements Plugin<MonitoringCollectionSetup, void, {}, {}> {
  private readonly initializerContext: PluginInitializerContext;
  private readonly log: Logger;
  private readonly getLogger: (...scopes: string[]) => Logger;
  private readonly config: MonitoringCollectionConfig;

  private metrics: Metric[] = [];

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
    this.log = initializerContext.logger.get(LOGGING_TAG);
    this.getLogger = (...scopes: string[]) => initializerContext.logger.get(LOGGING_TAG, ...scopes);
    this.config = createConfig(this.initializerContext.config.get<TypeOf<typeof configSchema>>());
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
