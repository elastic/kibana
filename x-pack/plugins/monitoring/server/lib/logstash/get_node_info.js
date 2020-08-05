/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, merge } from 'lodash';
import { checkParam } from '../error_missing_required';
import { calculateAvailability } from './../calculate_availability';

export function handleResponse(resp) {
  const source = get(resp, 'hits.hits[0]._source.logstash_stats');
  const logstash = get(source, 'logstash');
  const info = merge(logstash, {
    availability: calculateAvailability(get(source, 'timestamp')),
    events: get(source, 'events'),
    reloads: get(source, 'reloads'),
    queue_type: get(source, 'queue.type'),
    uptime: get(source, 'jvm.uptime_in_millis'),
  });
  return info;
}

export function getNodeInfo(req, lsIndexPattern, { clusterUuid, logstashUuid }) {
  checkParam(lsIndexPattern, 'lsIndexPattern in getNodeInfo');

  const params = {
    index: lsIndexPattern,
    size: 1,
    ignoreUnavailable: true,
    filterPath: [
      'hits.hits._source.logstash_stats.events',
      'hits.hits._source.logstash_stats.jvm.uptime_in_millis',
      'hits.hits._source.logstash_stats.logstash',
      'hits.hits._source.logstash_stats.queue.type',
      'hits.hits._source.logstash_stats.reloads',
      'hits.hits._source.logstash_stats.timestamp',
    ],
    body: {
      query: {
        bool: {
          filter: [
            { term: { cluster_uuid: clusterUuid } },
            { term: { 'logstash_stats.logstash.uuid': logstashUuid } },
          ],
        },
      },
      collapse: { field: 'logstash_stats.logstash.uuid' },
      sort: [{ timestamp: { order: 'desc' } }],
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params).then(handleResponse);
}
