/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// @ts-ignore
import { checkParam, MissingRequiredError } from '../../error_missing_required';
import { LegacyRequest } from '../../../types';

export async function getRule(
  req: LegacyRequest,
  kbnIndexPattern: string,
  ruleId: string,
  { clusterUuid }: { clusterUuid: string }
) {
  checkParam(kbnIndexPattern, 'kbnIndexPattern in getKibanaInfo');

  const filter = [
    { term: { cluster_uuid: clusterUuid } },
    { term: { 'kibana_metrics.rule.id': ruleId } },
  ];
  const params = {
    index: kbnIndexPattern,
    size: 1,
    ignore_unavailable: true,
    body: {
      sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
      query: {
        bool: {
          filter,
        },
      },
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response = await callWithRequest(req, 'search', params);
  return response.hits?.hits[0]?._source.kibana_metrics.rule;
}
