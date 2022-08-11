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

import { INDEX_PATTERN_LOGSTASH, TELEMETRY_QUERY_SOURCE } from '../../common/constants';

type Counter = Map<string, number>;

const HITS_SIZE = 10000; // maximum hits to receive from ES with each search

export interface LogstashBaseStats {
  // stats
  versions: Array<{ version: string; count: number }>;
  count: number;

  cluster_stats?: {
    collection_types?: { [collection_type_type: string]: number };
    queues?: { [queue_type: string]: number };
    plugins?: Array<{ name: string; count: number }>;
    pipelines?: {
      count?: number;
      batch_size_max?: number;
      batch_size_avg?: number;
      batch_size_min?: number;
      batch_size_total?: number;
      workers_max?: number;
      workers_avg?: number;
      workers_min?: number;
      workers_total?: number;
      sources?: { [source_type: string]: boolean };
    };
  };
}

const getLogstashBaseStats = () => ({
  versions: [],
  count: 0,
  cluster_stats: {
    pipelines: {},
    plugins: [],
  },
});

export interface LogstashStats {
  cluster_uuid: string;
  source_node: string;
  type: string;
  agent?: {
    type: string;
  };
  logstash_stats?: {
    pipelines?: [
      {
        id?: string;
        ephemeral_id: string;
        queue?: {
          type: string;
        };
      }
    ];
    logstash?: {
      version?: string;
      uuid?: string;
      snapshot?: string;
    };
  };
}

export interface LogstashState {
  logstash_state?: {
    pipeline?: {
      batch_size?: number;
      workers?: number;
      representation?: {
        graph?: {
          vertices?: [
            {
              config_name?: string;
              plugin_type?: string;
              meta?: {
                source?: {
                  protocol?: string;
                };
              };
            }
          ];
        };
      };
    };
  };
}

export interface LogstashProcessOptions {
  clusters: { [clusterUuid: string]: LogstashBaseStats };
  allEphemeralIds: { [clusterUuid: string]: string[] };
  versions: { [clusterUuid: string]: Counter };
  plugins: { [clusterUuid: string]: Counter };
}

/*
 * Update a clusters object with processed Logstash stats
 * @param {Array} results - array of LogstashStats docs from ES
 * @param {Object} clusters - LogstashBaseStats in an object keyed by the cluster UUIDs
 * @param {Object} allEphemeralIds - EphemeralIds in an object keyed by cluster UUIDs to track the pipelines for the cluster
 * @param {Object} versions - Versions in an object keyed by cluster UUIDs to track the logstash versions for the cluster
 * @param {Object} plugins - plugin information keyed by cluster UUIDs to count the unique plugins
 */
export function processStatsResults(
  results: estypes.SearchResponse<LogstashStats>,
  { clusters, allEphemeralIds, versions, plugins }: LogstashProcessOptions
) {
  const currHits = results?.hits?.hits || [];
  currHits.forEach((hit) => {
    const clusterUuid = hit._source!.cluster_uuid;
    if (clusters[clusterUuid] === undefined) {
      clusters[clusterUuid] = getLogstashBaseStats();
      versions[clusterUuid] = new Map();
      plugins[clusterUuid] = new Map();
    }
    const logstashStats = hit._source?.logstash_stats;
    const clusterStats = clusters[clusterUuid].cluster_stats;

    if (clusterStats !== undefined && logstashStats !== undefined) {
      clusters[clusterUuid].count = (clusters[clusterUuid].count || 0) + 1;

      const thisVersion = logstashStats.logstash?.version;
      const a: Counter = versions[clusterUuid];
      incrementByKey(a, thisVersion);
      clusters[clusterUuid].versions = mapToList(a, 'version');

      // Internal Collection has no agent field, so default to 'internal_collection'
      let thisCollectionType = hit._source?.agent?.type;
      if (thisCollectionType === undefined) {
        thisCollectionType = 'internal_collection';
      }
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
 * Update a clusters object with logstash state details
 * @param {Array} results - array of LogstashState docs from ES
 * @param {Object} clusters - LogstashBaseStats in an object keyed by the cluster UUIDs
 * @param {Object} plugins - plugin information keyed by cluster UUIDs to count the unique plugins
 */
export function processLogstashStateResults(
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

export async function fetchLogstashStats(
  callCluster: ElasticsearchClient,
  clusterUuids: string[],
  start: string,
  end: string,
  { page = 0, ...options }: { page?: number } & LogstashProcessOptions
): Promise<void> {
  const params: estypes.SearchRequest = {
    index: INDEX_PATTERN_LOGSTASH,
    ignore_unavailable: true,
    filter_path: [
      'hits.hits._source.cluster_uuid',
      'hits.hits._source.type',
      'hits.hits._source.source_node',
      'hits.hits._source.agent.type',
      'hits.hits._source.logstash_stats.pipelines.id',
      'hits.hits._source.logstash_stats.pipelines.ephemeral_id',
      'hits.hits._source.logstash_stats.pipelines.queue.type',
      'hits.hits._source.logstash_stats.logstash.version',
      'hits.hits._source.logstash_stats.logstash.uuid',
    ],
    body: {
      query: createQuery({
        start,
        end,
        filters: [
          { terms: { cluster_uuid: clusterUuids } },
          {
            bool: {
              should: [
                { term: { type: 'logstash_stats' } },
                { term: { 'metricset.name': 'stats' } },
              ],
            },
          },
        ],
      }) as estypes.QueryDslQueryContainer,
      from: page * HITS_SIZE,
      collapse: { field: 'logstash_stats.logstash.uuid' },
      sort: [{ ['logstash_stats.timestamp']: { order: 'desc', unmapped_type: 'long' } }],
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
    processStatsResults(results, options);
  }
  return Promise.resolve();
}

export async function fetchLogstashState(
  callCluster: ElasticsearchClient,
  clusterUuid: string,
  ephemeralIds: string[],
  start: string,
  end: string,
  { page = 0, ...options }: { page?: number } & LogstashProcessOptions
): Promise<void> {
  const params: estypes.SearchRequest = {
    index: INDEX_PATTERN_LOGSTASH,
    ignore_unavailable: true,
    filter_path: [
      'hits.hits._source.logstash_state.pipeline.batch_size',
      'hits.hits._source.logstash_state.pipeline.workers',
      'hits.hits._source.logstash_state.pipeline.representation.graph.vertices.config_name',
      'hits.hits._source.logstash_state.pipeline.representation.graph.vertices.plugin_type',
      'hits.hits._source.logstash_state.pipeline.representation.graph.vertices.meta.source.protocol',
      'hits.hits._source.logstash_state.pipeline.representation.graph.vertices',
      'hits.hits._source.type',
    ],
    body: {
      query: createQuery({
        start,
        end,
        filters: [
          { terms: { 'logstash_state.pipeline.ephemeral_id': ephemeralIds } },
          {
            bool: {
              must: { term: { type: 'logstash_state' } },
            },
          },
        ],
      }) as estypes.QueryDslQueryContainer,
      from: page * HITS_SIZE,
      collapse: { field: 'logstash_state.pipeline.ephemeral_id' },
      sort: [{ ['timestamp']: { order: 'desc', unmapped_type: 'long' } }],
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
    // further augment the clusters object with more stats
    processLogstashStateResults(results, clusterUuid, options);
  }
  return Promise.resolve();
}

export interface LogstashStatsByClusterUuid {
  [clusterUuid: string]: LogstashBaseStats;
}

/*
 * Call the function for fetching and summarizing Logstash stats
 * @return {Object} - Logstash stats in an object keyed by the cluster UUIDs
 */
export async function getLogstashStats(
  callCluster: ElasticsearchClient,
  clusterUuids: string[],
  start: string,
  end: string
): Promise<LogstashStatsByClusterUuid> {
  const options: LogstashProcessOptions = {
    clusters: {}, // the result object to be built up
    allEphemeralIds: {},
    versions: {},
    plugins: {},
  };

  await fetchLogstashStats(callCluster, clusterUuids, start, end, options);
  await Promise.all(
    clusterUuids.map(async (clusterUuid) => {
      if (options.clusters[clusterUuid] !== undefined) {
        await fetchLogstashState(
          callCluster,
          clusterUuid,
          options.allEphemeralIds[clusterUuid],
          start,
          end,
          options
        );
      }
    })
  );
  return options.clusters;
}
