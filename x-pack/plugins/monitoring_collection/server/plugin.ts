/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { CoreSetup, Plugin, PluginInitializerContext, Logger } from '@kbn/core/server';
import { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import { ServiceStatus } from '@kbn/core/server';
import { registerDynamicRoute } from './routes';
import { TYPE_ALLOWLIST } from './constants';

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
    this.logger.warn(`Call to 'getMetric' failed because type '${type}' does not exist.`);
    return undefined;
  }

  setup(core: CoreSetup) {
    const router = core.http.createRouter();
    const kibanaIndex = core.savedObjects.getKibanaIndex();

    let status: ServiceStatus<unknown>;
    core.status.overall$.subscribe((newStatus) => {
      status = newStatus;
    });

    registerDynamicRoute({
      router,
      config: {
        kibanaIndex,
        kibanaVersion: this.initializerContext.env.packageInfo.version,
        server: core.http.getServerInfo(),
        uuid: this.initializerContext.env.instanceUuid,
      },
      getStatus: () => status,
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
        if (!TYPE_ALLOWLIST.includes(metric.type)) {
          this.logger.warn(
            `Skipping registration of metric type '${metric.type}'. This type is not supported in the allowlist.`
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
