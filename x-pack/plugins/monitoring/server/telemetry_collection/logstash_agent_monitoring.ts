/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import moment from 'moment';
import { createQuery } from './create_query';
import { mapToList } from './get_high_level_stats';
import { incrementByKey } from './get_high_level_stats';
import {
  TELEMETRY_QUERY_SOURCE,
  INDEX_PATTERN_LOGSTASH_METRICS_PLUGINS,
  INDEX_PATTERN_LOGSTASH_METRICS_NODE,
} from '../../common/constants';
import {
  HITS_SIZE,
  LOGSTASH_PLUGIN_TYPES,
  getLogstashBaseStats,
  Counter,
  LogstashMonitoring,
  LogstashProcessOptions,
  LogstashState,
  LogstashStats,
  LogstashStatsByClusterUuid,
} from './logstash_monitoring';

export class LogstashAgentMonitoring implements LogstashMonitoring {
  /*
   * Call the function for fetching and summarizing Logstash metrics for agent (LS integration) monitoring
   * @param {Object} callCluster - ES client
   * @param {Array} clusterUuids - List cluster UUIDs to retrieve metrics
   * @param {string} monitoringClusterUuid - monitoring cluster UUID
   * @param {string} start - start timestamp
   * @param {string} end - end timestamp
   * @param {Object} options - additional processing required options
   * @return {Object} - Logstash stats in an object keyed by the cluster UUIDs
   * Note that, we try to fetch all metrics for the given time regardless of the cluster UUID
   * If metrics do not have UUID, metrics will be included in the monitoring cluster UUID
   */
  async collectMetrics(
    callCluster: ElasticsearchClient,
    clusterUuids: string[],
    monitoringClusterUuid: string,
    start: string,
    end: string,
    options: LogstashProcessOptions
  ): Promise<LogstashStatsByClusterUuid> {
    await this.fetchLogstashStats(callCluster, monitoringClusterUuid, start, end, options);

    const allHostIds = Object.values(options.allHostIds).flat();
    if (allHostIds.length > 0) {
      await this.fetchLogstashState(
        callCluster,
        allHostIds,
        monitoringClusterUuid,
        start,
        end,
        options
      );
    }
    return options.clusters;
  }

  setIndexPattern(monitoringType: string) {}

  /*
   * Update a clusters object with processed Logstash stats for agent monitoring
   * @param {Array} results - array of LogstashStats docs from ES
   * @param {Object} clusters - LogstashBaseStats in an object keyed by the cluster UUIDs
   * @param {Object} allEphemeralIds - EphemeralIds in an object keyed by cluster UUIDs to track the pipelines for the cluster
   * @param {Object} versions - Versions in an object keyed by cluster UUIDs to track the logstash versions for the cluster
   * @param {Object} plugins - plugin information keyed by cluster UUIDs to count the unique plugins
   * @param {string} monitoringClusterUuid - monitoring cluster UUID
   */
  private processStatsResults(
    results: estypes.SearchResponse<LogstashStats>,
    { clusters, allEphemeralIds, allHostIds, versions, plugins }: LogstashProcessOptions,
    monitoringClusterUuid: string
  ) {
    const currHits = results?.hits?.hits || [];
    currHits.forEach((hit) => {
      // if orphan (no uuid) cluster found, report it with monitoring cluster UUID
      const clusterId = hit._source!.logstash?.elasticsearch?.cluster?.id || [];
      const clusterUuid = clusterId[0] || monitoringClusterUuid;

      if (clusterUuid !== undefined && clusters[clusterUuid] === undefined) {
        clusters[clusterUuid] = getLogstashBaseStats();
        versions[clusterUuid] = new Map();
        plugins[clusterUuid] = new Map();
      }
      const logstashStats = hit._source?.logstash?.node?.stats;

      if (clusterUuid !== undefined && logstashStats !== undefined) {
        const clusterStats = clusters[clusterUuid].cluster_stats || {};
        clusterStats.monitoringClusterUuid = monitoringClusterUuid;
        clusters[clusterUuid].count = (clusters[clusterUuid].count || 0) + 1;

        const thisVersion = logstashStats.logstash?.version;
        const a: Counter = versions[clusterUuid];
        incrementByKey(a, thisVersion);
        clusters[clusterUuid].versions = mapToList(a, 'version');

        const ephemeralId = logstashStats.logstash?.ephemeral_id;
        if (ephemeralId !== undefined) {
          allEphemeralIds[clusterUuid] = allEphemeralIds[clusterUuid] || [];
          if (!allEphemeralIds[clusterUuid].includes(ephemeralId)) {
            allEphemeralIds[clusterUuid].push(ephemeralId);
          }
        }

        const hostId = hit._source?.host?.id;
        if (hostId !== undefined) {
          allHostIds[clusterUuid] = allHostIds[clusterUuid] || [];
          if (!allHostIds[clusterUuid].includes(hostId)) {
            allHostIds[clusterUuid].push(hostId);
          }
        }

        const thisCollectionType = hit._source?.agent?.type || 'agent';
        if (!Object.hasOwn(clusterStats, 'collection_types')) {
          clusterStats.collection_types = {};
        }
        clusterStats.collection_types![thisCollectionType] =
          (clusterStats.collection_types![thisCollectionType] || 0) + 1;
        const pipelines = logstashStats?.logstash?.pipelines || [];

        if (!Object.hasOwn(clusterStats, 'pipelines')) {
          clusterStats.pipelines = {};
        }
        clusterStats.pipelines!.count = pipelines.length;
        // TODO: add queue types of the pipelines with next iterations
      }
    });
  }

  /*
   * Update a clusters object with logstash state details for agent monitoring
   * @param {Array} results - array of LogstashState docs from ES
   * @param {Object} clusters - LogstashBaseStats in an object keyed by the cluster UUIDs
   * @param {Object} allEphemeralIds - EphemeralIds in an object keyed by cluster UUIDs to track the pipelines for the cluster
   * @param {Object} plugins - plugin information keyed by cluster UUIDs to count the unique plugins
   * @param {string} monitoringClusterUuid - monitoring cluster UUID
   */
  private processStateResults(
    results: estypes.SearchResponse<LogstashState>,
    { clusters, allEphemeralIds, plugins }: LogstashProcessOptions,
    monitoringClusterUuid: string
  ) {
    const currHits = results?.hits?.hits || [];
    currHits.forEach((hit) => {
      const clusterUuid =
        hit._source?.logstash?.pipeline?.elasticsearch?.cluster?.id || monitoringClusterUuid;
      const pipelineStats = clusters[clusterUuid]?.cluster_stats?.pipelines;
      // pipeline is defined in the mapping but contains plugin info in a reality
      const logstashStatePlugin = hit._source?.logstash?.pipeline;

      if (pipelineStats !== undefined && logstashStatePlugin !== undefined) {
        const pluginType = logstashStatePlugin?.plugin?.type;
        const pluginName = pluginType
          ? logstashStatePlugin?.plugin?.[`${pluginType}`]?.name
          : undefined;
        if (pluginName !== undefined && pluginType !== undefined) {
          incrementByKey(plugins[clusterUuid], `logstash-${pluginType}-${pluginName}`);
        }
        const clusterStats = clusters[clusterUuid]?.cluster_stats;
        if (clusterStats !== undefined) {
          clusterStats.plugins = mapToList(plugins[clusterUuid], 'name');
        }
      }
    });
  }

  /*
   * Creates a query and executes against ES to fetch agent monitoring, Logstash stats metrics
   * @param {Object} callCluster - ES client
   * @param {string} monitoringClusterUuid - monitoring cluster UUID
   * @param {string} start - start timestamp
   * @param {string} end - end timestamp
   * @param {Object} options - additional processing required options
   */
  private async fetchLogstashStats(
    callCluster: ElasticsearchClient,
    monitoringClusterUuid: string,
    start: string,
    end: string,
    { page = 0, ...options }: { page?: number } & LogstashProcessOptions
  ): Promise<void> {
    const filterPath: string[] = [
      'hits.hits._source.cluster_uuid',
      'hits.hits._source.agent.type',
      'hits.hits._source.host.id',
      'hits.hits._source.logstash.elasticsearch.cluster.id', // alias for cluster_uuid
      'hits.hits._source.logstash.node.stats.logstash',
    ];

    const params: estypes.SearchRequest = {
      index: INDEX_PATTERN_LOGSTASH_METRICS_NODE,
      ignore_unavailable: true,
      filter_path: filterPath,
      body: {
        query: createQuery({
          filters: [
            {
              bool: {
                should: [{ term: { 'data_stream.dataset': 'logstash.node' } }],
              },
            },
            {
              range: {
                '@timestamp': {
                  format: 'epoch_millis',
                  gte: moment.utc(start).valueOf(),
                  lte: moment.utc(end).valueOf(),
                },
              },
            },
          ],
        }) as estypes.QueryDslQueryContainer,
        collapse: {
          field: 'host.id',
        },
        sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'long' } }],
        from: page * HITS_SIZE,
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
   * Creates a query and executes against ES to fetch agent monitoring, Logstash state metrics
   * @param {Object} callCluster - ES client
   * @param {string} monitoringClusterUuid - monitoring cluster UUID
   * @param {Array} hostIds - Logstash host IDs
   * @param {string} start - start timestamp
   * @param {string} end - end timestamp
   * @param {Object} options - additional processing required options
   */
  private async fetchLogstashState(
    callCluster: ElasticsearchClient,
    hostIds: string[],
    monitoringClusterUuid: string,
    start: string,
    end: string,
    { page = 0, ...options }: { page?: number } & LogstashProcessOptions
  ): Promise<void> {
    const filters = [
      {
        bool: {
          should: [{ term: { 'data_stream.dataset': 'logstash.plugins' } }],
        },
      },
      { terms: { 'host.id': hostIds } },
      {
        range: {
          '@timestamp': {
            format: 'epoch_millis',
            gte: moment.utc(start).valueOf(),
            lte: moment.utc(end).valueOf(),
          },
        },
      },
    ];

    // collapse by `plugin-{type}.id` to gather unique plugins pipeline is using
    for (const pluginType of LOGSTASH_PLUGIN_TYPES) {
      const params: estypes.SearchRequest = {
        index: INDEX_PATTERN_LOGSTASH_METRICS_PLUGINS,
        ignore_unavailable: true,
        filter_path: ['hits.hits._source.logstash.pipeline'],
        body: {
          query: createQuery({
            filters,
          }) as estypes.QueryDslQueryContainer,
          collapse: { field: `logstash.pipeline.plugin.${pluginType}.id` },
          sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'long' } }],
          size: HITS_SIZE,
        },
      };

      const results = await callCluster.search<LogstashState>(params, {
        headers: {
          'X-QUERY-SOURCE': TELEMETRY_QUERY_SOURCE,
        },
      });
      const hitsLength = results?.hits?.hits.length || 0;
      if (hitsLength > 0) {
        this.processStateResults(results, options, monitoringClusterUuid);
      }
    }

    return Promise.resolve();
  }
}
