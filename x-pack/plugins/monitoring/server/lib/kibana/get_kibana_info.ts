/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
// @ts-ignore
import { checkParam, MissingRequiredError } from '../error_missing_required';
// @ts-ignore
import { calculateAvailability } from '../calculate_availability';
import { LegacyRequest } from '../../types';
import { ElasticsearchResponse } from '../../../common/types/es';
import { getNewIndexPatterns } from '../cluster/get_index_patterns';
import { Globals } from '../../static_globals';
import { buildKibanaInfo } from './build_kibana_info';

export function handleResponse(resp: ElasticsearchResponse) {
  const hit = resp.hits?.hits[0];
  const legacySource = hit?._source.kibana_stats;
  const mbSource = hit?._source.kibana?.stats;
  const availabilityTimestamp = hit?._source['@timestamp'] ?? legacySource?.timestamp;
  if (!availabilityTimestamp) {
    throw new MissingRequiredError('timestamp');
  }

  return merge(buildKibanaInfo(hit!), {
    availability: calculateAvailability(availabilityTimestamp),
    os_memory_free: mbSource?.os?.memory?.free_in_bytes ?? legacySource?.os?.memory?.free_in_bytes,
    uptime: mbSource?.process?.uptime?.ms ?? legacySource?.process?.uptime_in_millis,
  });
}

export function getKibanaInfo(
  req: LegacyRequest,
  { clusterUuid, kibanaUuid }: { clusterUuid: string; kibanaUuid: string }
) {
  const moduleType = 'kibana';
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    ccs: req.payload.ccs,
    moduleType,
  });
  const params = {
    index: indexPatterns,
    size: 1,
    ignore_unavailable: true,
    filter_path: [
      'hits.hits._source.kibana_stats.kibana',
      'hits.hits._source.kibana.stats',
      'hits.hits._source.kibana_stats.os.memory.free_in_bytes',
      'hits.hits._source.kibana.stats.os.memory.free_in_bytes',
      'hits.hits._source.kibana_stats.process.uptime_in_millis',
      'hits.hits._source.kibana.stats.process.uptime.ms',
      'hits.hits._source.kibana_stats.timestamp',
      'hits.hits._source.@timestamp',
      'hits.hits._source.service.id',
      'hits.hits._source.service.version',
    ],
    body: {
      query: {
        bool: {
          filter: [
            { term: { cluster_uuid: clusterUuid } },
            { term: { 'kibana_stats.kibana.uuid': kibanaUuid } },
          ],
        },
      },
      collapse: { field: 'kibana_stats.kibana.uuid' },
      sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params).then(handleResponse);
}
