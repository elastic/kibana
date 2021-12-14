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

export function handleResponse(resp: ElasticsearchResponse) {
  return resp.hits?.hits.map((hit) => {
    const legacySource = hit?._source.kibana_metrics;
    const mbSource = hit?._source.kibana?.metrics;
    return legacySource ?? mbSource;
  });
}

export function getKibanaMetrics(
  req: LegacyRequest,
  kbnIndexPattern: string,
  mergedQuery: object | undefined,
  { clusterUuid, kibanaUuid }: { clusterUuid: string; kibanaUuid: string }
) {
  checkParam(kbnIndexPattern, 'kbnIndexPattern in getKibanaInfo');

  const params = {
    index: kbnIndexPattern,
    size: 1000,
    ignore_unavailable: true,
    filter_path: [
      'hits.hits._source.kibana_metrics',
      // 'hits.hits._source.kibana.kibana',
      // 'hits.hits._source.kibana_stats.os.memory.free_in_bytes',
      // 'hits.hits._source.kibana.stats.os.memory.free_in_bytes',
      // 'hits.hits._source.kibana_stats.process.uptime_in_millis',
      // 'hits.hits._source.kibana.stats.process.uptime.ms',
      // 'hits.hits._source.kibana_stats.timestamp',
      'hits.hits._source.@timestamp',
    ],
    body: merge(
      {
        query: {
          bool: {
            filter: [
              { term: { cluster_uuid: clusterUuid } },
              { term: { 'kibana_metrics.kibana.uuid': kibanaUuid } },
            ],
          },
        },
        sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
      },
      mergedQuery
    ),
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params).then(handleResponse);
}
