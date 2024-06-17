/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { createQuery } from './create_query';
import { mapToList } from './get_high_level_stats';
import { incrementByKey } from './get_high_level_stats';
import { INDEX_PATTERN_LOGSTASH_MONITORING, TELEMETRY_QUERY_SOURCE } from '../../common/constants';
import {
  HITS_SIZE,
  getLogstashBaseStats,
  Counter,
  LogstashMonitoring,
  LogstashProcessOptions,
  LogstashState,
  LogstashStats,
  LogstashStatsByClusterUuid,
} from './logstash_monitoring';

export class LogstashSelfMonitoring implements LogstashMonitoring {
  /*
   * Call the function for fetching and summarizing Logstash metrics for self/legacy monitoring
   * @param {Object} callCluster - ES client
   * @param {Array} clusterUuids - List cluster UUIDs to retrieve metrics
   * @param {string} monitoringClusterUuid - monitoring cluster UUID
   * @param {string} start - start timestamp
   * @param {string} end - end timestamp
   * @param {Object} options - additional processing required options
   * @return {Object} - Logstash stats in an object keyed by the cluster UUIDs
   * Note that, we _only_ fetch metrics for the given time and cluster UUIDs
   */
  async collectMetrics(
    callCluster: ElasticsearchClient,
    clusterUuids: string[],
    monitoringClusterUuid: string,
    start: string,
    end: string,
    options: LogstashProcessOptions
  ): Promise<LogstashStatsByClusterUuid> {
    for (const clusterUuid of clusterUuids) {
      await this.fetchLogstashStats(
        callCluster,
        clusterUuid,
        monitoringClusterUuid,
        start,
        end,
        options
      );

      if (options.clusters[clusterUuid] !== undefined) {
        await this.fetchLogstashState(
          callCluster,
          clusterUuid,
          options.allEphemeralIds[clusterUuid],
          start,
          end,
          options
        );
      }
    }
    return options.clusters;
  }

  setIndexPattern(monitoringType: string) {}
  /*
   * Update a clusters object with processed Logstash stats for self monitoring
   * @param {Array} results - array of LogstashStats docs from ES
   * @param {Object} clusters - LogstashBaseStats in an object keyed by the cluster UUIDs
   * @param {Object} allEphemeralIds - EphemeralIds in an object keyed by cluster UUIDs to track the pipelines for the cluster
   * @param {Object} versions - Versions in an object keyed by cluster UUIDs to track the logstash versions for the cluster
   * @param {Object} plugins - plugin information keyed by cluster UUIDs to count the unique plugins
   * @param {string} monitoringClusterUuid - monitoring cluster UUID
   */
  private processStatsResults(
    results: estypes.SearchResponse<LogstashStats>,
    { clusters, allEphemeralIds, versions, plugins }: LogstashProcessOptions,
    monitoringClusterUuid: string
  ) {
    const currHits = results?.hits?.hits || [];
    currHits.forEach((hit) => {
      const clusterUuid = hit._source!.cluster_uuid;

      if (clusterUuid !== undefined && clusters[clusterUuid] === undefined) {
        clusters[clusterUuid] = getLogstashBaseStats();
        versions[clusterUuid] = new Map();
        plugins[clusterUuid] = new Map();
      }
      const logstashStats = hit._source?.logstash_stats;

      if (clusterUuid !== undefined && logstashStats !== undefined) {
        const clusterStats = clusters[clusterUuid].cluster_stats || {};
        clusterStats.monitoringClusterUuid = monitoringClusterUuid;
        clusters[clusterUuid].count = (clusters[clusterUuid].count || 0) + 1;

        const thisVersion = logstashStats.logstash?.version;
        const a: Counter = versions[clusterUuid];
        incrementByKey(a, thisVersion);
        clusters[clusterUuid].versions = mapToList(a, 'version');

        // Internal Collection has no agent field, so default to 'internal_collection'
        const thisCollectionType = hit._source?.agent?.type || 'internal_collection';
        if (!clusterStats.hasOwnProperty('collection_types')) {
          clusterStats.collection_types = {};
        }
        clusterStats.collection_types![thisCollectionType] =
          (clusterStats.collection_types![thisCollectionType] || 0) + 1;
        const pipelines = logstashStats.pipelines || [];

        pipelines.forEach((pipeline) => {
          const thisQueueType = pipeline.queue?.type;
          if (thisQueueType !== undefined) {
            if (!clusterStats.hasOwnProperty('queues')) {
              clusterStats.queues = {};
            }
            clusterStats.queues![thisQueueType] = (clusterStats.queues![thisQueueType] || 0) + 1;
          }

          const ephemeralId = pipeline.ephemeral_id;
          if (ephemeralId !== undefined) {
            allEphemeralIds[clusterUuid] = allEphemeralIds[clusterUuid] || [];
            allEphemeralIds[clusterUuid].push(ephemeralId);
          }
        });
      }
    });
  }

  /*
   * Update a clusters object with logstash state details for self monitoring
   * @param {Array} results - array of LogstashState docs from ES
   * @param {string} clusterUuid - A cluster UUID
   * @param {Object} clusters - LogstashBaseStats in an object keyed by the cluster UUIDs
   * @param {Object} plugins - plugin information keyed by cluster UUIDs to count the unique plugins
   */
  private processStateResults(
    results: estypes.SearchResponse<LogstashState>,
    clusterUuid: string,
    { clusters, plugins }: LogstashProcessOptions
  ) {
    const currHits = results?.hits?.hits || [];
    const clusterStats = clusters[clusterUuid].cluster_stats;
    const pipelineStats = clusters[clusterUuid].cluster_stats?.pipelines;

    currHits.forEach((hit) => {
      const thisLogstashStatePipeline = hit._source?.logstash_state?.pipeline;

      if (pipelineStats !== undefined && thisLogstashStatePipeline !== undefined) {
        pipelineStats.count = (pipelineStats.count || 0) + 1;

        const thisPipelineBatchSize = thisLogstashStatePipeline.batch_size;

        if (thisPipelineBatchSize !== undefined) {
          pipelineStats.batch_size_total =
            (pipelineStats.batch_size_total || 0) + thisPipelineBatchSize;
          pipelineStats.batch_size_max = pipelineStats.batch_size_max || 0;
          pipelineStats.batch_size_min = pipelineStats.batch_size_min || 0;
          pipelineStats.batch_size_avg = pipelineStats.batch_size_total / pipelineStats.count;

          if (thisPipelineBatchSize > pipelineStats.batch_size_max) {
            pipelineStats.batch_size_max = thisPipelineBatchSize;
          }
          if (
            pipelineStats.batch_size_min === 0 ||
            thisPipelineBatchSize < pipelineStats.batch_size_min
          ) {
            pipelineStats.batch_size_min = thisPipelineBatchSize;
          }
        }

        const thisPipelineWorkers = thisLogstashStatePipeline.workers;
        if (thisPipelineWorkers !== undefined) {
          pipelineStats.workers_total = (pipelineStats.workers_total || 0) + thisPipelineWorkers;
          pipelineStats.workers_max = pipelineStats.workers_max || 0;
          pipelineStats.workers_min = pipelineStats.workers_min || 0;
          pipelineStats.workers_avg = pipelineStats.workers_total / pipelineStats.count;

          if (thisPipelineWorkers > pipelineStats.workers_max) {
            pipelineStats.workers_max = thisPipelineWorkers;
          }
          if (pipelineStats.workers_min === 0 || thisPipelineWorkers < pipelineStats.workers_min) {
            pipelineStats.workers_min = thisPipelineWorkers;
          }
        }

        // Extract the vertices object from the pipeline representation. From this, we can
        // retrieve the source of the pipeline element on the configuration(from file, string, or
        // x-pack-config-management), and the input, filter and output plugins from that pipeline.
        const vertices = thisLogstashStatePipeline.representation?.graph?.vertices;

        if (vertices !== undefined) {
          vertices.forEach((vertex) => {
            const configName = vertex.config_name;
            const pluginType = vertex.plugin_type;
            let pipelineConfig = vertex.meta?.source?.protocol;

            if (pipelineConfig !== undefined) {
              if (pipelineConfig === 'string' || pipelineConfig === 'str') {
                pipelineConfig = 'string';
              } else if (pipelineConfig === 'x-pack-config-management') {
                pipelineConfig = 'xpack';
              } else {
                pipelineConfig = 'file';
              }
              if (!pipelineStats.hasOwnProperty('sources')) {
                pipelineStats.sources = {};
              }
              pipelineStats.sources![pipelineConfig] = true;
            }
            if (configName !== undefined && pluginType !== undefined) {
              incrementByKey(plugins[clusterUuid], `logstash-${pluginType}-${configName}`);
            }
          });
        }
      }
    });
    if (clusterStats !== undefined) {
      clusterStats.plugins = mapToList(plugins[clusterUuid], 'name');
    }
  }

  /*
   * Creates a query and executes against ES to fetch self monitoring, Logstash stats metrics
   * @param {Object} callCluster - ES client
   * @param {string} clusterUuid - A cluster UUID
   * @param {string} monitoringClusterUuid - A monitoring cluster UUID
   * @param {string} start - start timestamp
   * @param {string} end - end timestamp
   * @param {Object} options - additional processing required options
   */
  private async fetchLogstashStats(
    callCluster: ElasticsearchClient,
    clusterUuid: string,
    monitoringClusterUuid: string,
    start: string,
    end: string,
    { page = 0, ...options }: { page?: number } & LogstashProcessOptions
  ): Promise<void> {
    const filterPath: string[] = [
      'hits.hits._source.cluster_uuid',
      'hits.hits._source.type',
      'hits.hits._source.source_node',
      'hits.hits._source.agent.type',
      'hits.hits._source.logstash.elasticsearch.cluster.id', // alias for cluster_uuid
      'hits.hits._source.logstash_stats.pipelines.id',
      'hits.hits._source.logstash_stats.pipelines.ephemeral_id',
      'hits.hits._source.logstash_stats.pipelines.queue.type',
      'hits.hits._source.logstash_stats.logstash.version',
      'hits.hits._source.logstash_stats.logstash.uuid',
    ];

    const params: estypes.SearchRequest = {
      index: INDEX_PATTERN_LOGSTASH_MONITORING,
      ignore_unavailable: true,
      filter_path: filterPath,
      body: {
        query: createQuery({
          start,
          end,
          filters: [
            { term: { cluster_uuid: clusterUuid } },
            {
              bool: {
                should: [{ term: { type: 'logstash_stats' } }],
              },
            },
          ],
        }) as estypes.QueryDslQueryContainer,
        from: page * HITS_SIZE,
        collapse: {
          field: 'logstash_stats.logstash.uuid',
        },
        sort: [{ ['timestamp']: { order: 'desc', unmapped_type: 'long' } }],
        size: HITS_SIZE,
      },
    };

    const results = await callCluster.search<LogstashStats>(params, {
      headers: {
        'X-QUERY-SOURCE': TELEMETRY_QUERY_SOURCE,
      },
    });
    const hitsLength = results?.hits?.hits.length || 0;

    if (hitsLength > 0) {
      // further augment the clusters object with more stats
      this.processStatsResults(results, options, monitoringClusterUuid);
    }
    return Promise.resolve();
  }

  /*
   * Creates a query and executes against ES to fetch self monitoring, Logstash state metrics
   * @param {Object} callCluster - ES client
   * @param {string} clusterUuid - A cluster UUID
   * @param {Array} ephemeralIds - Logstash pipeline ephemeral IDs
   * @param {string} start - start timestamp
   * @param {string} end - end timestamp
   * @param {Object} options - additional processing required options
   */
  private async fetchLogstashState(
    callCluster: ElasticsearchClient,
    clusterUuid: string,
    ephemeralIds: string[],
    start: string,
    end: string,
    { page = 0, ...options }: { page?: number } & LogstashProcessOptions
  ): Promise<void> {
    const filterPath: string[] = [
      'hits.hits._source.logstash_state.pipeline.batch_size',
      'hits.hits._source.logstash_state.pipeline.workers',
      'hits.hits._source.logstash_state.pipeline.representation.graph.vertices',
      'hits.hits._source.type',
    ];

    const params: estypes.SearchRequest = {
      index: INDEX_PATTERN_LOGSTASH_MONITORING,
      ignore_unavailable: true,
      filter_path: filterPath,
      body: {
        query: createQuery({
          start,
          end,
          filters: [
            { terms: { 'logstash_state.pipeline.ephemeral_id': ephemeralIds } },
            {
              bool: {
                should: [{ term: { type: 'logstash_state' } }],
              },
            },
          ],
        }) as estypes.QueryDslQueryContainer,
        collapse: {
          field: 'logstash_state.pipeline.ephemeral_id',
        },
        sort: [{ ['timestamp']: { order: 'desc', unmapped_type: 'long' } }],
        size: ephemeralIds.length,
      },
    };

    const results = await callCluster.search<LogstashState>(params, {
      headers: {
        'X-QUERY-SOURCE': TELEMETRY_QUERY_SOURCE,
      },
    });

    const hitsLength = results?.hits?.hits.length || 0;
    if (hitsLength > 0) {
      // further augment the clusters object with more stats
      this.processStateResults(results, clusterUuid, options);
    }
    return Promise.resolve();
  }
}
