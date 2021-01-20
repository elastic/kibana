/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
// @ts-ignore
import { checkParam } from '../error_missing_required';
// @ts-ignore
import { ElasticsearchMetric } from '../metrics';
// @ts-ignore
import { createQuery } from '../create_query';
import { ElasticsearchResponse } from '../../../common/types/es';
import { LegacyRequest } from '../../types';

export function handleResponse(response: ElasticsearchResponse) {
  const isEnabled = response.hits?.hits[0]?._source.stack_stats?.xpack?.ccr?.enabled ?? undefined;
  const isAvailable =
    response.hits?.hits[0]?._source.stack_stats?.xpack?.ccr?.available ?? undefined;
  return isEnabled && isAvailable;
}

export async function checkCcrEnabled(req: LegacyRequest, esIndexPattern: string) {
  checkParam(esIndexPattern, 'esIndexPattern in getNodes');

  const start = moment.utc(req.payload.timeRange.min).valueOf();
  const end = moment.utc(req.payload.timeRange.max).valueOf();

  const clusterUuid = req.params.clusterUuid;
  const metricFields = ElasticsearchMetric.getMetricFields();

  const params = {
    index: esIndexPattern,
    size: 1,
    ignoreUnavailable: true,
    body: {
      query: createQuery({
        type: 'cluster_stats',
        start,
        end,
        clusterUuid,
        metric: metricFields,
      }),
      sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
    },
    filterPath: ['hits.hits._source.stack_stats.xpack.ccr'],
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response = await callWithRequest(req, 'search', params);
  return handleResponse(response);
}
