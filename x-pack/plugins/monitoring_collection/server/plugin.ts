/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import apm from 'elastic-apm-node';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  Plugin,
  PluginInitializerContext,
  Logger,
  CoreStart,
  ICustomClusterClient,
  IClusterClient,
} from '@kbn/core/server';
import { METRICSET_ALLOWLIST } from './constants';
import { MonitoringCollectionConfig } from './config';
import { ValidMetricSet } from '../common/types';

export interface MonitoringCollectionSetup {
  registerMetricSet: <T extends ValidMetricSet>(metric: MetricSet<T>) => void;
  aggregateMonitoringData: (
    query: estypes.QueryDslQueryContainer,
    aggs: Record<string, estypes.AggregationsAggregationContainer>
  ) => Promise<Record<string, estypes.AggregationsAggregate> | undefined>;
}
export interface MonitoringCollectionStart {
  reportGauge: (name: string, dimensions: Record<string, string>, value: number) => void;
  reportCounter: (name: string, dimensions: Record<string, string>, amount?: number) => void;
  registerCustomElasticsearchClient: (customClient: ICustomClusterClient) => void;
}

export interface MetricSet<T extends ValidMetricSet> {
  id: string;
  fetch: () => Promise<T>;
}

export type KibanaIdentifier = Record<string, string> & {
  kibana_version: string;
  kibana_uuid: string;
  es_cluster_uuid?: string;
};

export class MonitoringCollectionPlugin implements Plugin<MonitoringCollectionSetup, void, {}, {}> {
  private readonly initializerContext: PluginInitializerContext;
  private readonly logger: Logger;
  private readonly config: MonitoringCollectionConfig;

  private metricSets: Record<string, MetricSet<ValidMetricSet>> = {};
  private results: Record<string, ValidMetricSet> = {};
  private client?: IClusterClient | ICustomClusterClient;
  private kibanaVersion?: string;
  private kibanaUuid?: string;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get();
  }

  setup() {
    this.kibanaVersion = this.initializerContext.env.packageInfo.version;
    this.kibanaUuid = this.initializerContext.env.instanceUuid;

    return {
      registerMetricSet: <T extends ValidMetricSet>(metricSet: MetricSet<T>) => {
        if (this.metricSets.hasOwnProperty(metricSet.id)) {
          this.logger.warn(
            `Skipping registration of metric set '${metricSet.id}'. It was has already been registered.`
          );
          return;
        }
        if (!METRICSET_ALLOWLIST.includes(metricSet.id)) {
          this.logger.warn(
            `Skipping registration of metric set '${metricSet.id}'. This id is not supported in the allowlist.`
          );
          return;
        }

        this.results[metricSet.id] = {};
        this.metricSets[metricSet.id] = metricSet;
      },
      // Maybe this belongs in start but this will be used by routes which are usually created in setup
      aggregateMonitoringData: async (
        query: estypes.QueryDslQueryContainer,
        aggs: Record<string, estypes.AggregationsAggregationContainer>
      ) => {
        const request: estypes.SearchRequest = {
          index: this.config.metricsIndex,
          size: 0,
          body: {
            query,
            aggs,
          },
        };

        try {
          const results = await this.client?.asInternalUser.search(request);
          return results?.aggregations;
        } catch (err) {
          return {};
        }
      },
    };
  }

  start(core: CoreStart) {
    this.client = core.elasticsearch.client;
    const kibanaDimensions: KibanaIdentifier = {
      kibana_version: this.kibanaVersion!,
      kibana_uuid: this.kibanaUuid!,
    };

    (async () => {
      const response = await core.elasticsearch.client.asInternalUser.info({
        filter_path: 'cluster_uuid',
      });

      kibanaDimensions.es_cluster_uuid = response.cluster_uuid;
    })();

    setInterval(async () => {
      const ids = Object.keys(this.metricSets);
      // TODO: think about how to make this not suck
      // abort controller, maybe chunk it and perform with some backoff?
      const results = await Promise.all(ids.map((id) => this.metricSets[id].fetch()));
      ids.forEach((id, idIndex) => {
        this.results[id] = results[idIndex];
      });
    }, this.config.interval);

    return {
      reportCounter: (name: string, dimensions: Record<string, string>, amount: number = 1) => {
        try {
          // @ts-ignore-line
          const counter = apm.registerMetricCounter(name, {
            ...dimensions,
            ...kibanaDimensions,
          });
          if (counter) {
            counter.inc(amount);
          }
        } catch (err) {
          this.logger.warn(`Unable to report counter for ${name} due to ${err.message}`);
        }
      },
      reportGauge: (name: string, dimensions: Record<string, string>, value: number) => {
        // if (typeof name !== 'string') {

        // }
        try {
          apm.registerMetric(name, { ...dimensions, ...kibanaDimensions }, () => value);
        } catch (err) {
          this.logger.warn(`Unable to report gauge for ${name} due to ${err.message}`);
        }
      },
      registerCustomElasticsearchClient: (customClient: ICustomClusterClient) => {
        this.client = customClient;
      },
    };
  }

  stop() {}
}
