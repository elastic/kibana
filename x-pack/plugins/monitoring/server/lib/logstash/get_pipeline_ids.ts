/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { get } from 'lodash';
import { LegacyRequest, Bucket, Pipeline } from '../../types';
import { createQuery } from '../create_query';
import { LogstashMetric } from '../metrics';
import { getNewIndexPatterns } from '../cluster/get_index_patterns';
import { Globals } from '../../static_globals';

interface GetLogstashPipelineIdsParams {
  req: LegacyRequest;
  clusterUuid?: string;
  size: number;
  logstashUuid?: string;
  ccs?: string[];
}
export async function getLogstashPipelineIds({
  req,
  clusterUuid,
  logstashUuid,
  size,
  ccs,
}: GetLogstashPipelineIdsParams): Promise<Pipeline[]> {
  const start = moment.utc(req.payload.timeRange.min).valueOf();
  const end = moment.utc(req.payload.timeRange.max).valueOf();

  const filters = [];
  if (logstashUuid) {
    filters.push({ term: { 'logstash_stats.logstash.uuid': logstashUuid } });
  }

  const dataset = 'node_stats';
  const moduleType = 'logstash';
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    ccs: ccs || req.payload.ccs,
    moduleType,
    dataset,
  });

  const params = {
    index: indexPatterns,
    size: 0,
    ignore_unavailable: true,
    filter_path: ['aggregations.nest.id.buckets', 'aggregations.nest_mb.id.buckets'],
    body: {
      query: createQuery({
        start,
        end,
        metric: LogstashMetric.getMetricFields(),
        clusterUuid,
        filters,
      }),
      aggs: {
        nest: {
          nested: {
            path: 'logstash_stats.pipelines',
          },
          aggs: {
            id: {
              terms: {
                field: 'logstash_stats.pipelines.id',
                size,
              },
              aggs: {
                unnest: {
                  reverse_nested: {},
                  aggs: {
                    nodes: {
                      terms: {
                        field: 'logstash_stats.logstash.uuid',
                        size,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        nest_mb: {
          nested: {
            path: 'logstash.node.stats.pipelines',
          },
          aggs: {
            id: {
              terms: {
                field: 'logstash.node.stats.pipelines.id',
                size,
              },
              aggs: {
                unnest_mb: {
                  reverse_nested: {},
                  aggs: {
                    nodes: {
                      terms: {
                        field: 'logstash.node.stats.logstash.uuid',
                        size,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response = await callWithRequest(req, 'search', params);
  let buckets = get(response, 'aggregations.nest_mb.id.buckets', []);
  if (!buckets || buckets.length === 0) {
    buckets = get(response, 'aggregations.nest.id.buckets', []);
  }
  return buckets.map((bucket: Bucket) => {
    let nodeBuckets = get(bucket, 'unnest_mb.nodes.buckets', []);
    if (!nodeBuckets || nodeBuckets.length === 0) {
      nodeBuckets = get(bucket, 'unnest.nodes.buckets', []);
    }
    return {
      id: bucket.key,
      nodeIds: nodeBuckets.map((item: Bucket) => item.key),
    };
  });
}
