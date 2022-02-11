/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { CoreSetup, Plugin, PluginInitializerContext, Logger } from 'kibana/server';
import { registerDynamicRoute } from './routes';
import { MakeSchemaFrom } from '../../../../src/plugins/usage_collection/server';

export interface MonitoringCollectionSetup {
  registerMetric: <T>(metric: Metric<T>) => void;
}

export type MetricResult<T> = T & JsonObject;

export interface Metric<T> {
  type: string;
  schema: MakeSchemaFrom<T>;
  fetch: () => Promise<MetricResult<T> | Array<MetricResult<T>>>;
}

export class MonitoringCollectionPlugin implements Plugin<MonitoringCollectionSetup, void, {}, {}> {
  private readonly initializerContext: PluginInitializerContext;
  private readonly logger: Logger;

  private metrics: Record<string, Metric<any>> = {};

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
    this.logger = initializerContext.logger.get();
  }

  async getMetric(type: string) {
    if (this.metrics.hasOwnProperty(type)) {
      return await this.metrics[type].fetch();
    }
    return undefined;
  }

  setup(core: CoreSetup) {
    const router = core.http.createRouter();
    const kibanaIndex = core.savedObjects.getKibanaIndex();

    registerDynamicRoute({
      router,
      config: {
        allowAnonymous: core.status.isStatusPageAnonymous(),
        kibanaIndex,
        kibanaVersion: this.initializerContext.env.packageInfo.version,
        server: core.http.getServerInfo(),
        uuid: this.initializerContext.env.instanceUuid,
      },
      overallStatus$: core.status.overall$,
      getMetric: async (type: string) => {
        return await this.getMetric(type);
      },
    });

    return {
      registerMetric: <T>(metric: Metric<T>) => {
        if (this.metrics.hasOwnProperty(metric.type)) {
          this.logger.warn(
            `Skipping registration of metric type '${metric.type}'. This type has already been registered.`
          );
          return;
        }
        this.metrics[metric.type] = metric;
      },
    };
  }

  start() {}

  stop() {}
}
