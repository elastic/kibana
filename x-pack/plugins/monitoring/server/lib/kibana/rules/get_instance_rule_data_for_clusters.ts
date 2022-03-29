/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// @ts-ignore
import { checkParam, MissingRequiredError } from '../../error_missing_required';
import { Cluster, LegacyRequest } from '../../../types';
import { getNewIndexPatterns } from '../../cluster/get_index_patterns';
import { Globals } from '../../../static_globals';
import { createQuery } from '../../create_query';
import { KibanaClusterRuleMetric } from '../../metrics';

export async function getInstanceRuleDataForClusters(
  req: LegacyRequest,
  clusters: Cluster[],
  ccs: string
) {
  const start = req.payload.timeRange.min;
  const end = req.payload.timeRange.max;

  const moduleType = 'kibana';
  const type = 'kibana_node_rules';
  const dataset = 'node_rules';
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    moduleType,
    dataset,
    ccs,
  });

  return Promise.all(
    clusters.map(async (cluster) => {
      const clusterUuid = cluster.elasticsearch?.cluster?.id ?? cluster.cluster_uuid;
      const metric = KibanaClusterRuleMetric.getMetricFields();
      const params = {
        index: indexPatterns,
        size: 0,
        ignore_unavailable: true,
        body: {
          query: createQuery({
            type,
            dsDataset: `${moduleType}.${dataset}`,
            metricset: dataset,
            start,
            end,
            clusterUuid,
            metric,
          }),
          aggs: {
            executions: {
              max: {
                field: 'kibana.node_rules.executions',
              },
            },
            failures: {
              max: {
                field: 'kibana.node_rules.failures',
              },
            },
            timeouts: {
              max: {
                field: 'kibana.node_rules.timeouts',
              },
            },
          },
        },
      };

      const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
      const response = await callWithRequest(req, 'search', params);
      return {
        failures: response.aggregations?.failures?.value,
        executions: response.aggregations?.executions?.value,
        timeouts: response.aggregations?.timeouts?.value,
        clusterUuid,
      };
    })
  );
}
