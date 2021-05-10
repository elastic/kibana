/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
// @ts-ignore
import { checkParam } from '../error_missing_required';
// @ts-ignore
import { calculateAvailability } from '../calculate_availability';
import { LegacyRequest } from '../../types';
import { ElasticsearchResponse } from '../../../common/types/es';

export function handleResponse(resp: ElasticsearchResponse) {
  const legacySource = resp.hits?.hits[0]?._source.kibana_stats;
  const mbSource = resp.hits?.hits[0]?._source.kibana?.stats;
  const kibana = resp.hits?.hits[0]?._source.kibana?.kibana ?? legacySource?.kibana;
  return merge(kibana, {
    availability: calculateAvailability(
      resp.hits?.hits[0]?._source['@timestamp'] ?? legacySource?.timestamp
    ),
    os_memory_free: mbSource?.os?.memory?.free_in_bytes ?? legacySource?.os?.memory?.free_in_bytes,
    uptime: mbSource?.process?.uptime?.ms ?? legacySource?.process?.uptime_in_millis,
  });
}

export function getKibanaInfo(
  req: LegacyRequest,
  kbnIndexPattern: string,
  { clusterUuid, kibanaUuid }: { clusterUuid: string; kibanaUuid: string }
) {
  checkParam(kbnIndexPattern, 'kbnIndexPattern in getKibanaInfo');

  const params = {
    index: kbnIndexPattern,
    size: 1,
    ignoreUnavailable: true,
    filterPath: [
      'hits.hits._source.kibana_stats.kibana',
      'hits.hits._source.kibana.kibana',
      'hits.hits._source.kibana_stats.os.memory.free_in_bytes',
      'hits.hits._source.kibana.stats.os.memory.free_in_bytes',
      'hits.hits._source.kibana_stats.process.uptime_in_millis',
      'hits.hits._source.kibana.stats.process.uptime.ms',
      'hits.hits._source.kibana_stats.timestamp',
      'hits.hits._source.@timestamp',
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
