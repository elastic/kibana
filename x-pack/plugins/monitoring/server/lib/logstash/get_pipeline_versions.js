/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createQuery } from '../create_query';
import { LogstashMetric } from '../metrics';
import { get } from 'lodash';
import { checkParam } from '../error_missing_required';

function fetchPipelineVersions(...args) {
  const [ req, config, logstashIndexPattern, clusterUuid, pipelineId ] = args;
  checkParam(logstashIndexPattern, 'logstashIndexPattern in getPipelineVersions');
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');

  const filters = [
    {
      nested: {
        path: 'logstash_stats.pipelines',
        query: {
          bool: {
            filter: [
              { term: { 'logstash_stats.pipelines.id': pipelineId } },
            ]
          }
        }
      }
    }
  ];
  const query = createQuery({
    type: 'logstash_stats',
    metric: LogstashMetric.getMetricFields(),
    clusterUuid,
    filters
  });

  const filteredAggs = {
    by_pipeline_hash: {
      terms: {
        field: 'logstash_stats.pipelines.hash',
        size: config.get('xpack.monitoring.max_bucket_size'),
        order: { 'path_to_root>first_seen': 'desc' }
      },
      aggs: {
        path_to_root: {
          reverse_nested: {},
          aggs: {
            first_seen: {
              min: {
                field: 'logstash_stats.timestamp'
              }
            },
            last_seen: {
              max: {
                field: 'logstash_stats.timestamp'
              }
            }
          }
        }
      }
    }
  };

  const aggs = {
    pipelines: {
      nested: {
        path: 'logstash_stats.pipelines'
      },
      aggs: {
        scoped: {
          filter: {
            bool: {
              filter: [
                { term: { 'logstash_stats.pipelines.id': pipelineId } }
              ]
            }
          },
          aggs: filteredAggs
        }
      }
    }
  };

  const params = {
    index: logstashIndexPattern,
    size: 0,
    ignoreUnavailable: true,
    body: {
      sort: { timestamp: { order: 'desc' } },
      query,
      aggs
    },
  };

  return callWithRequest(req, 'search', params);
}

export function _handleResponse(response) {
  const pipelineHashes = get(response, 'aggregations.pipelines.scoped.by_pipeline_hash.buckets', []);
  return pipelineHashes.map(pipelineHash => ({
    hash: pipelineHash.key,
    firstSeen: get(pipelineHash, 'path_to_root.first_seen.value'),
    lastSeen: get(pipelineHash, 'path_to_root.last_seen.value')
  }));
}

export async function getPipelineVersions(...args) {
  const response = await fetchPipelineVersions(...args);
  return _handleResponse(response);
}
