/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext, Logger } from 'kibana/server';
import { registerDynamicRoute } from './routes';
import { INDEX_TEMPLATE_KIBANA } from '../../monitoring/common/constants';
import { MakeSchemaFrom } from '../../../../src/plugins/usage_collection/server';
import { verifyMappings } from './lib';

export interface MonitoringCollectionSetup {
  registerMetric: <T>(metric: Metric<T>) => void;
  getMetrics: <T>() => Promise<Record<string, MetricResult<T> | Array<MetricResult<T>>>>;
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

  private metrics: Array<Metric<any>> = [];
  private disabledMetricTypes: string[] = [];

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
    this.logger = initializerContext.logger.get();
  }

  async getAllMetrics() {
    const metrics: Record<string, MetricResult<any> | Array<MetricResult<any>>> = {};
    for (const metric of this.metrics) {
      if (this.disabledMetricTypes.includes(metric.type)) {
        this.logger.info(
          `Unable to get metrics for ${metric.type} type because this type is disabled. Please see startup Kibana server logs for more details.`
        );
        continue;
      }
      metrics[metric.type] = await metric.fetch();
    }
    return metrics;
  }

  async getMetrics(type?: string) {
    if (type && this.disabledMetricTypes.includes(type)) {
      this.logger.warn(
        `Unable to get metrics for ${type} type because this type is disabled. Please see startup Kibana server logs for more details.`
      );
      return undefined;
    }
    for (const metric of this.metrics) {
      if (metric.type === type) {
        return await metric.fetch();
      }
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
      getMetrics: async (type: string) => {
        return await this.getMetrics(type);
      },
    });

    return {
      registerMetric: <T>(metric: Metric<T>) => {
        this.metrics.push(metric);
      },
      getMetrics: async () => await this.getAllMetrics(),
    };
  }

  async start(core: CoreStart) {
    const esClient = core.elasticsearch.client.asInternalUser;

    verifyMappings({
      client: esClient,
      name: INDEX_TEMPLATE_KIBANA,
      metrics: this.metrics,
      logger: this.logger,
    }).then((types) => types && this.disabledMetricTypes.push(...types));
  }

  stop() {}
}
