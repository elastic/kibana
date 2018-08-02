/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, merge } from 'lodash';
import { checkParam } from '../error_missing_required';

export function handleResponse(resp) {
  const source = get(resp, 'hits.hits[0]._source.beats_stats');
  const beat = get(source, 'beat');
  return merge(
    beat,
    {
      // availability: calculateAvailability(get(source, 'timestamp')),
      // os_memory_free: get(source, 'os.memory.free_in_bytes'),
      // uptime: get(source, 'process.uptime_in_millis')
    }
  );
}

export function getApmInfo(req, apmIndexPattern, { clusterUuid, apmUuid }) {
  checkParam(apmIndexPattern, 'apmIndexPattern in getApmInfo');

  const params = {
    index: apmIndexPattern,
    size: 1,
    ignoreUnavailable: true,
    filterPath: [
      'hits.hits._source.beats_stats.beat',
      'hits.hits._source.beats_stats.timestamp'
    ],
    body: {
      query: {
        bool: {
          filter: [
            { term: { 'cluster_uuid': clusterUuid } },
            { term: { 'beats_stats.beat.uuid': apmUuid } }
          ]
        }
      },
      collapse: { field: 'beats_stats.beat.uuid' },
      sort: [
        { timestamp: { order: 'desc' } }
      ]
    }
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params)
    .then(handleResponse);
}
