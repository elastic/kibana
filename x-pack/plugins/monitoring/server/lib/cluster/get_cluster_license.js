/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { checkParam } from '../error_missing_required';
import { createQuery } from '../create_query';
import { ElasticsearchMetric } from '../metrics';

export function getClusterLicense(req, esIndexPattern, clusterUuid) {
  checkParam(esIndexPattern, 'esIndexPattern in getClusterLicense');

  const params = {
    index: esIndexPattern,
    size: 1,
    ignoreUnavailable: true,
    filterPath: 'hits.hits._source.license',
    body: {
      sort: { timestamp: { order: 'desc' } },
      query: createQuery({
        type: 'cluster_stats',
        clusterUuid,
        metric: ElasticsearchMetric.getMetricFields(),
      }),
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params).then((response) => {
    return get(response, 'hits.hits[0]._source.license', {});
  });
}
