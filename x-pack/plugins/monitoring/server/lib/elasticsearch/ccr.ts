/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { getNewIndexPatterns } from '../cluster/get_index_patterns';
import { Globals } from '../../static_globals';

export async function checkCcrEnabled(req: LegacyRequest, ccs: string) {
  const dataset = 'cluster_stats';
  const moduleType = 'elasticsearch';
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    moduleType,
    dataset,
    ccs,
  });

  const start = moment.utc(req.payload.timeRange.min).valueOf();
  const end = moment.utc(req.payload.timeRange.max).valueOf();

  const clusterUuid = req.params.clusterUuid;
  const metricFields = ElasticsearchMetric.getMetricFields();

  const params = {
    index: indexPatterns,
    size: 1,
    ignore_unavailable: true,
    body: {
      query: createQuery({
        type: dataset,
        dsDataset: `${moduleType}.${dataset}`,
        metricset: dataset,
        start,
        end,
        clusterUuid,
        metric: metricFields,
      }),
      sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
    },
    filter_path: [
      'hits.hits._source.stack_stats.xpack.ccr',
      'hits.hits._source.elasticsearch.cluster.stats.stack.xpack.ccr',
    ],
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response: ElasticsearchResponse = await callWithRequest(req, 'search', params);
  const legacyCcr = response.hits?.hits[0]?._source.stack_stats?.xpack?.ccr;
  const mbCcr = response.hits?.hits[0]?._source?.elasticsearch?.cluster?.stats?.stack?.xpack?.ccr;
  const isEnabled = legacyCcr?.enabled ?? mbCcr?.enabled;
  const isAvailable = legacyCcr?.available ?? mbCcr?.available;
  return Boolean(isEnabled && isAvailable);
}
