/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Cluster, LegacyRequest } from '../../../types';
import { getIndexPatterns, getKibanaDataset } from '../../cluster/get_index_patterns';
import { Globals } from '../../../static_globals';
import { createQuery } from '../../create_query';
import { KibanaClusterRuleMetric } from '../../metrics';

export async function getClusterRuleDataForClusters(
  req: LegacyRequest,
  clusters: Cluster[],
  ccs: string
) {
  const start = req.payload.timeRange.min;
  const end = req.payload.timeRange.max;

  const moduleType = 'kibana';
  const type = 'kibana_cluster_rules';
  const dataset = 'cluster_rules';
  const indexPatterns = getIndexPatterns({
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
            dsDataset: getKibanaDataset(dataset),
            metricset: dataset,
            start,
            end,
            clusterUuid,
            metric,
          }),
          aggs: {
            indices: {
              terms: {
                field: '_index',
                size: 1,
              },
            },
            overdue_count: {
              max: {
                field: 'kibana.cluster_rules.overdue.count',
              },
            },
            overdue_delay_p50: {
              max: {
                field: 'kibana.cluster_rules.overdue.delay.p50',
              },
            },
            overdue_delay_p99: {
              max: {
                field: 'kibana.cluster_rules.overdue.delay.p99',
              },
            },
          },
        },
      };
      const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
      const response = await callWithRequest(req, 'search', params);
      const indices = response.aggregations?.indices?.buckets ?? [];
      if (indices.length === 0) {
        // This means they are only using internal monitoring and rule monitoring data is not available
        return null;
      }
      return {
        overdue: {
          count: response.aggregations?.overdue_count?.value,
          delay: {
            p50: response.aggregations?.overdue_delay_p50?.value,
            p99: response.aggregations?.overdue_delay_p99?.value,
          },
        },
        clusterUuid,
      };
    })
  );
}
