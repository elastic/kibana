/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-ignore
import { checkParam } from '../error_missing_required';
// @ts-ignore
import { createQuery } from '../create_query';
// @ts-ignore
import { ElasticsearchMetric } from '../metrics';
import { ElasticsearchResponse } from '../../../common/types/es';
import { LegacyRequest } from '../../types';
import { getNewIndexPatterns } from './get_index_patterns';
import { Globals } from '../../static_globals';

// is this being used anywhere?  not called within the app
export function getClusterLicense(req: LegacyRequest, clusterUuid: string) {
  const dataset = 'cluster_stats';
  const moduleType = 'elasticsearch';
  const indexPattern = getNewIndexPatterns({
    config: Globals.app.config,
    moduleType,
    dataset,
    ccs: req.payload.ccs,
  });

  const params = {
    index: indexPattern,
    size: 1,
    ignore_unavailable: true,
    filter_path: ['hits.hits._source.license'],
    body: {
      sort: { timestamp: { order: 'desc', unmapped_type: 'long' } },
      query: createQuery({
        type: dataset,
        dsDataset: `${moduleType}.${dataset}`,
        metricset: dataset,
        clusterUuid,
        metric: ElasticsearchMetric.getMetricFields(),
      }),
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params).then((response: ElasticsearchResponse) => {
    return response.hits?.hits[0]?._source.license;
  });
}
