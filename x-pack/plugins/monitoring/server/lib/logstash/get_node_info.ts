/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { MissingRequiredError } from '../error_missing_required';
import { calculateAvailability } from '../calculate_availability';
import { LegacyRequest } from '../../types';
import { ElasticsearchResponse } from '../../../common/types/es';
import { STANDALONE_CLUSTER_CLUSTER_UUID } from '../../../common/constants';
import { standaloneClusterFilter } from '../standalone_clusters/standalone_cluster_query_filter';
import { getNewIndexPatterns } from '../cluster/get_index_patterns';
import { Globals } from '../../static_globals';

export function handleResponse(resp: ElasticsearchResponse) {
  const legacyStats = resp.hits?.hits[0]?._source?.logstash_stats;
  const mbStats = resp.hits?.hits[0]?._source?.logstash?.node?.stats;
  const logstash = mbStats?.logstash ?? legacyStats?.logstash;
  const availabilityTimestamp = mbStats?.timestamp ?? legacyStats?.timestamp;
  if (!availabilityTimestamp) {
    throw new MissingRequiredError('timestamp');
  }
  const info = merge(logstash, {
    availability: calculateAvailability(availabilityTimestamp),
    events: mbStats?.events ?? legacyStats?.events,
    reloads: mbStats?.reloads ?? legacyStats?.reloads,
    queue_type: mbStats?.queue?.type ?? legacyStats?.queue?.type,
    uptime: mbStats?.jvm?.uptime_in_millis ?? legacyStats?.jvm?.uptime_in_millis,
  });
  return info;
}

export function getNodeInfo(
  req: LegacyRequest,
  { clusterUuid, logstashUuid }: { clusterUuid: string; logstashUuid: string }
) {
  const isStandaloneCluster = clusterUuid === STANDALONE_CLUSTER_CLUSTER_UUID;

  const clusterFilter = isStandaloneCluster
    ? standaloneClusterFilter
    : { term: { cluster_uuid: clusterUuid } };

  const dataset = 'node_stats';
  const moduleType = 'logstash';
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    ccs: req.payload.ccs,
    moduleType,
    dataset,
  });

  const params = {
    index: indexPatterns,
    size: 1,
    ignore_unavailable: true,
    filter_path: [
      'hits.hits._source.logstash_stats.events',
      'hits.hits._source.logstash.node.stats.events',
      'hits.hits._source.logstash_stats.jvm.uptime_in_millis',
      'hits.hits._source.logstash.node.stats.jvm.uptime_in_millis',
      'hits.hits._source.logstash_stats.logstash',
      'hits.hits._source.logstash.node.stats.logstash',
      'hits.hits._source.logstash_stats.queue.type',
      'hits.hits._source.logstash.node.stats.queue.type',
      'hits.hits._source.logstash_stats.reloads',
      'hits.hits._source.logstash.node.stats.reloads',
      'hits.hits._source.logstash_stats.timestamp',
      'hits.hits._source.logstash.node.stats.timestamp',
    ],
    body: {
      query: {
        bool: {
          filter: [clusterFilter, { term: { 'logstash_stats.logstash.uuid': logstashUuid } }],
        },
      },
      collapse: { field: 'logstash_stats.logstash.uuid' },
      sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params).then(handleResponse);
}
