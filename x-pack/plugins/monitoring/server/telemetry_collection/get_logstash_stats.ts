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
  // legacy monitoring shape
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
  // metricbeat monitoring shape
  logstash?: {
    node?: {
      stats?: {
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
    };
    elasticsearch?: {
      cluster?: {
        id?: string;
      };
    };
  };
}

export interface LogstashState {
  // legacy monitoring shape
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
  // metricbeat monitoring shape
  logstash?: {
    node?: {
      state?: {
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
  { clusters, allEphemeralIds, versions, plugins }: LogstashProcessOptions,
  isSelfMonitoring: boolean
) {
  const currHits = results?.hits?.hits || [];
  currHits.forEach((hit) => {
    const clusterUuid = isSelfMonitoring
      ? hit._source!.cluster_uuid
      : hit._source!.logstash?.elasticsearch?.cluster?.id;

    if (clusterUuid !== undefined && clusters[clusterUuid] === undefined) {
      clusters[clusterUuid] = getLogstashBaseStats();
      versions[clusterUuid] = new Map();
      plugins[clusterUuid] = new Map();
    }
    const logstashStats = isSelfMonitoring
      ? hit._source?.logstash_stats
      : hit._source?.logstash?.node?.stats;

    if (clusterUuid !== undefined && logstashStats !== undefined) {
      const clusterStats = clusters[clusterUuid].cluster_stats || {};
      clusters[clusterUuid].count = (clusters[clusterUuid].count || 0) + 1;

      const thisVersion = logstashStats.logstash?.version;
      const a: Counter = versions[clusterUuid];
      incrementByKey(a, thisVersion);
      clusters[clusterUuid].versions = mapToList(a, 'version');

      // Internal Collection has no agent field, so default to 'internal_collection'
      let thisCollectionType = isSelfMonitoring ? 'internal_collection' : hit._source?.agent?.type;
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
  { clusters, versions, plugins }: LogstashProcessOptions,
  isSelfMonitoring: boolean
) {
  const currHits = results?.hits?.hits || [];
  const clusterStats = clusters[clusterUuid].cluster_stats;
  const pipelineStats = clusters[clusterUuid].cluster_stats?.pipelines;

  currHits.forEach((hit) => {
    const thisLogstashStatePipeline = isSelfMonitoring
      ? hit._source?.logstash_state?.pipeline
      : hit._source?.logstash?.node?.state?.pipeline;

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
  clusterUuid: string,
  start: string,
  end: string,
  { page = 0, ...options }: { page?: number } & LogstashProcessOptions,
  isSelfMonitoring: boolean
): Promise<void> {
  const statsField = isSelfMonitoring ? 'logstash_stats' : 'logstash.node.stats';
  const filterPath: string[] = [
    'hits.hits._source.cluster_uuid',
    'hits.hits._source.type',
    'hits.hits._source.source_node',
    'hits.hits._source.agent.type',
    'hits.hits._source.logstash.elasticsearch.cluster.id', // alias for cluster_uuid
    `hits.hits._source.${statsField}.pipelines.id`,
    `hits.hits._source.${statsField}.pipelines.ephemeral_id`,
    `hits.hits._source.${statsField}.pipelines.queue.type`,
    `hits.hits._source.${statsField}.logstash.version`,
    `hits.hits._source.${statsField}.logstash.uuid`,
  ];

  const params: estypes.SearchRequest = {
    index: INDEX_PATTERN_LOGSTASH,
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
              should: [
                { term: { type: 'logstash_stats' } },
                { term: { 'metricset.name': 'node_stats' } },
              ],
            },
          },
        ],
      }) as estypes.QueryDslQueryContainer,
      from: page * HITS_SIZE,
      collapse: {
        field: `${statsField}.logstash.uuid`,
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
    processStatsResults(results, options, isSelfMonitoring);
  }
  return Promise.resolve();
}

export async function fetchLogstashState(
  callCluster: ElasticsearchClient,
  clusterUuid: string,
  ephemeralIds: string[],
  start: string,
  end: string,
  { page = 0, ...options }: { page?: number } & LogstashProcessOptions,
  isSelfMonitoring: boolean
): Promise<void> {
  const stateField = isSelfMonitoring ? 'logstash_state' : 'logstash.node.state';
  const filterPath: string[] = [
    `hits.hits._source.${stateField}.pipeline.batch_size`,
    `hits.hits._source.${stateField}.pipeline.workers`,
    `hits.hits._source.${stateField}.pipeline.representation.graph.vertices`,
    `hits.hits._source.type`,
  ];

  const params: estypes.SearchRequest = {
    index: INDEX_PATTERN_LOGSTASH,
    ignore_unavailable: true,
    filter_path: filterPath,
    body: {
      query: createQuery({
        // intentionally not using start and end periods as we need node state info to fill plugin usages
        // especially with metricbeat monitoring
        filters: [
          { terms: { [`${stateField}.pipeline.ephemeral_id`]: ephemeralIds } },
          {
            bool: {
              should: [
                { term: { type: 'logstash_state' } },
                { term: { 'metricset.name': 'node' } },
              ],
            },
          },
        ],
      }) as estypes.QueryDslQueryContainer,
      collapse: {
        field: `${stateField}.pipeline.ephemeral_id`,
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
    processLogstashStateResults(results, clusterUuid, options, isSelfMonitoring);
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

  // if index name contains '-mb', means metricbeat based monitoring
  // filter_path and collapse fields in the queries differ on metricbeat vs. self-monitoring
  // note: agent driven LS monitoring indices pattern differ ".ds-metrics-logstash*"
  for (const clusterUuid of clusterUuids) {
    const logstashMonitoringIndex: string = await getLogstashMonitoringIndex(
      callCluster,
      clusterUuid
    );

    // no need to proceed if we don't have monitoring metrics
    if (logstashMonitoringIndex !== '') {
      const isSelfMonitoring: boolean = logstashMonitoringIndex.indexOf('-mb') === -1;
      await fetchLogstashStats(callCluster, clusterUuid, start, end, options, isSelfMonitoring);

      if (options.clusters[clusterUuid] !== undefined) {
        await fetchLogstashState(
          callCluster,
          clusterUuid,
          options.allEphemeralIds[clusterUuid],
          start,
          end,
          options,
          isSelfMonitoring
        );
      }
    }
  }
  return options.clusters;
}

export async function getLogstashMonitoringIndex(
  callCluster: ElasticsearchClient,
  clusterUuid: string
): Promise<string> {
  const params: estypes.SearchRequest = {
    index: INDEX_PATTERN_LOGSTASH,
    ignore_unavailable: true,
    body: {
      query: createQuery({
        clusterUuid,
      }) as estypes.QueryDslQueryContainer,
      sort: [{ ['timestamp']: { order: 'desc', unmapped_type: 'long' } }],
      size: 1,
    },
  };

  const results = await callCluster.search<LogstashStats>(params, {
    headers: {
      'X-QUERY-SOURCE': TELEMETRY_QUERY_SOURCE,
    },
  });
  const hitsLength = results?.hits?.hits.length || 0;
  if (hitsLength > 0) {
    const [firstDocument] = results.hits.hits;
    return Promise.resolve(firstDocument._index);
  }
  return Promise.resolve('');
}
