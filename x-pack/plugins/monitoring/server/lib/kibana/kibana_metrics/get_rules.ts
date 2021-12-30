/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// @ts-ignore
import { checkParam, MissingRequiredError } from '../../error_missing_required';
import { LegacyRequest } from '../../../types';

export async function getRules(
  req: LegacyRequest,
  kbnIndexPattern: string,
  { clusterUuid, kibanaUuid }: { clusterUuid: string; kibanaUuid?: string }
) {
  checkParam(kbnIndexPattern, 'kbnIndexPattern in getKibanaInfo');

  const filter = [{ term: { cluster_uuid: clusterUuid } }];
  if (kibanaUuid) {
    filter.push({ term: { 'kibana_metrics.kibana.uuid': kibanaUuid } });
  }

  const params = {
    index: kbnIndexPattern,
    size: 0,
    ignore_unavailable: true,
    body: {
      query: {
        bool: {
          filter,
        },
      },
      aggs: {
        rules: {
          terms: {
            field: 'kibana_metrics.rule.id',
          },
          aggs: {
            first: {
              top_hits: {
                sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
                size: 1,
                _source: 'kibana_metrics.rule',
              },
            },
          },
        },
      },
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response = await callWithRequest(req, 'search', params);
  return response.aggregations?.rules?.buckets?.map((bucket) => {
    return bucket?.first?.hits?.hits[0]._source?.kibana_metrics?.rule;
  });
}
