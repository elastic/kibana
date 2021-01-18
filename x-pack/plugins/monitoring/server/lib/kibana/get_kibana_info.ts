/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge } from 'lodash';
// @ts-ignore
import { checkParam } from '../error_missing_required';
// @ts-ignore
import { calculateAvailability } from '../calculate_availability';
import { LegacyRequest } from '../../types';
import { ElasticsearchResponse } from '../../../common/types/es';

export function handleResponse(resp: ElasticsearchResponse) {
  const source = resp.hits?.hits[0]?._source.kibana_stats;
  const kibana = source?.kibana;
  return merge(kibana, {
    availability: calculateAvailability(source?.timestamp),
    os_memory_free: source?.os?.memory?.free_in_bytes,
    uptime: source?.process?.uptime_in_millis,
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
      'hits.hits._source.kibana_stats.os.memory.free_in_bytes',
      'hits.hits._source.kibana_stats.process.uptime_in_millis',
      'hits.hits._source.kibana_stats.timestamp',
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
