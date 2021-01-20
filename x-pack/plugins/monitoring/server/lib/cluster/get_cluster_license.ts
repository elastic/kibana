/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { checkParam } from '../error_missing_required';
// @ts-ignore
import { createQuery } from '../create_query';
// @ts-ignore
import { ElasticsearchMetric } from '../metrics';
import { ElasticsearchResponse } from '../../../common/types/es';
import { LegacyRequest } from '../../types';

export function getClusterLicense(req: LegacyRequest, esIndexPattern: string, clusterUuid: string) {
  checkParam(esIndexPattern, 'esIndexPattern in getClusterLicense');

  const params = {
    index: esIndexPattern,
    size: 1,
    ignoreUnavailable: true,
    filterPath: 'hits.hits._source.license',
    body: {
      sort: { timestamp: { order: 'desc', unmapped_type: 'long' } },
      query: createQuery({
        type: 'cluster_stats',
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
