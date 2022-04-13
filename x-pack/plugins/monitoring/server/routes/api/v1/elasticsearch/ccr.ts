/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import moment from 'moment';
import { get, groupBy } from 'lodash';
// @ts-ignore
import { handleError } from '../../../../lib/errors/handle_error';
// @ts-ignore
import { prefixIndexPattern } from '../../../../../common/ccs_utils';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../../../../common/constants';
import {
  ElasticsearchResponse,
  ElasticsearchLegacySource,
  ElasticsearchMetricbeatSource,
} from '../../../../../common/types/es';
import { LegacyRequest } from '../../../../types';
import { MonitoringConfig } from '../../../../config';

function getBucketScript(max: string, min: string) {
  return {
    bucket_script: {
      buckets_path: {
        max,
        min,
      },
      script: 'params.max - params.min',
    },
  };
}

function buildRequest(req: LegacyRequest, config: MonitoringConfig, esIndexPattern: string) {
  const min = moment.utc(req.payload.timeRange.min).valueOf();
  const max = moment.utc(req.payload.timeRange.max).valueOf();
  const maxBucketSize = config.ui.max_bucket_size;
  const aggs = {
    ops_synced_max: {
      max: {
        field: 'ccr_stats.operations_written',
      },
    },
    ops_synced_min: {
      min: {
        field: 'ccr_stats.operations_written',
      },
    },
    lag_ops_leader_max: {
      max: {
        field: 'ccr_stats.leader_max_seq_no',
      },
    },
    lag_ops_leader_min: {
      min: {
        field: 'ccr_stats.leader_max_seq_no',
      },
    },
    lag_ops_global_max: {
      max: {
        field: 'ccr_stats.follower_global_checkpoint',
      },
    },
    lag_ops_global_min: {
      min: {
        field: 'ccr_stats.follower_global_checkpoint',
      },
    },
    leader_lag_ops_checkpoint_max: {
      max: {
        field: 'ccr_stats.leader_global_checkpoint',
      },
    },
    leader_lag_ops_checkpoint_min: {
      min: {
        field: 'ccr_stats.leader_global_checkpoint',
      },
    },

    ops_synced: getBucketScript('ops_synced_max', 'ops_synced_min'),
    lag_ops_leader: getBucketScript('lag_ops_leader_max', 'lag_ops_leader_min'),
    lag_ops_global: getBucketScript('lag_ops_global_max', 'lag_ops_global_min'),
    lag_ops: getBucketScript('lag_ops_leader', 'lag_ops_global'),
    lag_ops_leader_checkpoint: getBucketScript(
      'leader_lag_ops_checkpoint_max',
      'leader_lag_ops_checkpoint_min'
    ),
    leader_lag_ops: getBucketScript('lag_ops_leader', 'lag_ops_leader_checkpoint'),
    follower_lag_ops: getBucketScript('lag_ops_leader_checkpoint', 'lag_ops_global'),
  };

  return {
    index: esIndexPattern,
    size: maxBucketSize,
    filter_path: [
      'hits.hits.inner_hits.by_shard.hits.hits._source.ccr_stats.read_exceptions',
      'hits.hits.inner_hits.by_shard.hits.hits._source.elasticsearch.ccr.read_exceptions',
      'hits.hits.inner_hits.by_shard.hits.hits._source.ccr_stats.follower_index',
      'hits.hits.inner_hits.by_shard.hits.hits._source.elasticsearch.ccr.follower.index',
      'hits.hits.inner_hits.by_shard.hits.hits._source.ccr_stats.shard_id',
      'hits.hits.inner_hits.by_shard.hits.hits._source.elasticsearch.ccr.follower.shard.number',
      'hits.hits.inner_hits.by_shard.hits.hits._source.ccr_stats.time_since_last_read_millis',
      'hits.hits.inner_hits.by_shard.hits.hits._source.elasticsearch.ccr.follower.time_since_last_read.ms',
      'aggregations.by_follower_index.buckets.key',
      'aggregations.by_follower_index.buckets.leader_index.buckets.key',
      'aggregations.by_follower_index.buckets.leader_index.buckets.remote_cluster.buckets.key',
      'aggregations.by_follower_index.buckets.by_shard_id.buckets.key',
      'aggregations.by_follower_index.buckets.by_shard_id.buckets.ops_synced.value',
      'aggregations.by_follower_index.buckets.by_shard_id.buckets.lag_ops.value',
      'aggregations.by_follower_index.buckets.by_shard_id.buckets.leader_lag_ops.value',
      'aggregations.by_follower_index.buckets.by_shard_id.buckets.follower_lag_ops.value',
    ],
    body: {
      sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
      query: {
        bool: {
          must: [
            {
              bool: {
                should: [
                  {
                    term: {
                      type: {
                        value: 'ccr_stats',
                      },
                    },
                  },
                  {
                    term: {
                      'metricset.name': {
                        value: 'ccr',
                      },
                    },
                  },
                ],
              },
            },
            {
              range: {
                timestamp: {
                  format: 'epoch_millis',
                  gte: min,
                  lte: max,
                },
              },
            },
          ],
        },
      },
      collapse: {
        field: 'ccr_stats.follower_index',
        inner_hits: {
          name: 'by_shard',
          sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
          size: maxBucketSize,
          collapse: {
            field: 'ccr_stats.shard_id',
          },
        },
      },
      aggs: {
        by_follower_index: {
          terms: {
            field: 'ccr_stats.follower_index',
            size: maxBucketSize,
          },
          aggs: {
            leader_index: {
              terms: {
                field: 'ccr_stats.leader_index',
                size: 1,
              },
              aggs: {
                remote_cluster: {
                  terms: {
                    field: 'ccr_stats.remote_cluster',
                    size: 1,
                  },
                },
              },
            },
            by_shard_id: {
              terms: {
                field: 'ccr_stats.shard_id',
                size: 10,
              },
              aggs,
            },
          },
        },
      },
    },
  };
}

export function ccrRoute(server: { route: (p: any) => void; config: MonitoringConfig }) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/elasticsearch/ccr',
    config: {
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
        }),
        body: schema.object({
          ccs: schema.maybe(schema.string()),
          timeRange: schema.object({
            min: schema.string(),
            max: schema.string(),
          }),
        }),
      },
    },
    async handler(req: LegacyRequest) {
      const config = server.config;
      const ccs = req.payload.ccs;
      const esIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_ELASTICSEARCH, ccs);

      try {
        const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
        const params = buildRequest(req, config, esIndexPattern);
        const response: ElasticsearchResponse = await callWithRequest(req, 'search', params);

        if (!response || Object.keys(response).length === 0) {
          return { data: [] };
        }

        const fullStats: {
          [key: string]: Array<
            | NonNullable<ElasticsearchLegacySource['ccr_stats']>
            | NonNullable<ElasticsearchMetricbeatSource['elasticsearch']>['ccr']
          >;
        } =
          response.hits?.hits.reduce((accum, hit) => {
            const innerHits = hit.inner_hits?.by_shard.hits?.hits ?? [];
            const grouped = groupBy(innerHits, (innerHit) => {
              if (innerHit._source.ccr_stats) {
                return `${innerHit._source.ccr_stats.follower_index}:${innerHit._source.ccr_stats.shard_id}`;
              } else if (innerHit._source.elasticsearch?.ccr?.follower?.shard) {
                return `${innerHit._source.elasticsearch?.ccr?.follower?.index}:${innerHit._source.elasticsearch?.ccr?.follower?.shard?.number}`;
              }
            });

            return {
              ...accum,
              ...grouped,
            };
          }, {}) ?? {};

        const buckets = response.aggregations?.by_follower_index.buckets ?? [];
        const data = buckets.reduce((accum: any, bucket: any) => {
          const leaderIndex = get(bucket, 'leader_index.buckets[0].key');
          const remoteCluster = get(
            bucket,
            'leader_index.buckets[0].remote_cluster.buckets[0].key'
          );
          const follows = remoteCluster ? `${leaderIndex} on ${remoteCluster}` : leaderIndex;
          const stat: {
            [key: string]: any;
            shards: Array<{
              error?: string;
              opsSynced: number;
              syncLagTime: number;
              syncLagOps: number;
            }>;
          } = {
            id: bucket.key,
            index: bucket.key,
            follows,
            shards: [],
            error: undefined,
            opsSynced: undefined,
            syncLagTime: undefined,
            syncLagOps: undefined,
          };

          stat.shards = get(bucket, 'by_shard_id.buckets').reduce(
            (accum2: any, shardBucket: any) => {
              const fullStat: any = fullStats[`${bucket.key}:${shardBucket.key}`][0];
              const fullLegacyStat: ElasticsearchLegacySource = fullStat._source?.ccr_stats
                ? fullStat._source
                : null;
              const fullMbStat: ElasticsearchMetricbeatSource = fullStat._source?.elasticsearch?.ccr
                ? fullStat._source
                : null;
              const readExceptions =
                fullLegacyStat?.ccr_stats?.read_exceptions ??
                fullMbStat?.elasticsearch?.ccr?.read_exceptions ??
                [];
              const shardStat = {
                shardId: shardBucket.key,
                error: readExceptions.length ? readExceptions[0].exception?.type : null,
                opsSynced: get(shardBucket, 'ops_synced.value'),
                syncLagTime:
                  // @ts-ignore
                  fullLegacyStat?.ccr_stats?.time_since_last_read_millis ??
                  fullMbStat?.elasticsearch?.ccr?.follower?.time_since_last_read?.ms,
                syncLagOps: get(shardBucket, 'lag_ops.value'),
                syncLagOpsLeader: get(shardBucket, 'leader_lag_ops.value'),
                syncLagOpsFollower: get(shardBucket, 'follower_lag_ops.value'),
              };
              accum2.push(shardStat);
              return accum2;
            },
            []
          );

          stat.error = (stat.shards.find((shard) => shard.error) || {}).error;
          stat.opsSynced = stat.shards.reduce((sum, { opsSynced }) => sum + opsSynced, 0);
          stat.syncLagTime = stat.shards.reduce(
            (max, { syncLagTime }) => Math.max(max, syncLagTime),
            0
          );
          stat.syncLagOps = stat.shards.reduce(
            (max, { syncLagOps }) => Math.max(max, syncLagOps),
            0
          );

          accum.push(stat);
          return accum;
        }, []);

        return { data };
      } catch (err) {
        return handleError(err, req);
      }
    },
  });
}
