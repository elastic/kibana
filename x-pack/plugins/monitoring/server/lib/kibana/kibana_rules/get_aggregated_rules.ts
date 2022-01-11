/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// @ts-ignore
import { checkParam, MissingRequiredError } from '../../error_missing_required';
import { LegacyRequest, Cluster } from '../../../types';
import { createQuery } from '../../create_query';
import { KibanaRule } from '../../metrics';

export async function getAggregatedRules(
  req: LegacyRequest,
  kbnIndexPattern: string,
  clusters: Cluster[]
) {
  checkParam(kbnIndexPattern, 'kbnIndexPattern in getKibanaInfo');

  // const config = req.server.config();
  const start = req.payload.timeRange.min;
  const end = req.payload.timeRange.max;

  return Promise.all(
    clusters.map(async (cluster) => {
      const metric = KibanaRule.getMetricFields();
      const params = {
        index: kbnIndexPattern,
        size: 0,
        ignore_unavailable: true,
        body: {
          query: createQuery({
            types: ['kibana_rule', 'rule'],
            start,
            end,
            clusterUuid: cluster.cluster_uuid ?? cluster.elasticsearch?.cluster?.id,
            metric,
          }),
          aggs: {
            rule_ids: {
              terms: {
                field: 'kibana_rule.rule.id',
                size: 1000,
              },
            },
            average_duration: {
              avg: {
                field: 'kibana_rule.rule.averageDuration',
              },
            },
          },
        },
      };

      const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
      const response = await callWithRequest(req, 'search', params);
      return {
        clusterUuid: cluster.cluster_uuid ?? cluster.elasticsearch?.cluster?.id,
        rules: {
          averageDuration: response?.aggregations?.average_duration?.value,
          count: response?.aggregations?.rule_ids?.buckets?.length,
        },
      };
    })
  );
}
