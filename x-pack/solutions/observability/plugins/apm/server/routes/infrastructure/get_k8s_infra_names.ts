/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import type { InfraMetricsClient } from '../../lib/helpers/create_es_client/create_infra_metrics_client/create_infra_metrics_client';

const K8S_POD_NAME = 'k8s.pod.name';
const K8S_DEPLOYMENT_NAME = 'k8s.deployment.name';
const K8S_NODE_NAME = 'k8s.node.name';

/**
 * Resolves K8s deployment names and node names from pod names by querying
 * the metrics indices (k8sclusterreceiver data).
 *
 * Pod metrics docs in k8sclusterreceiver contain `k8s.pod.name` alongside
 * `k8s.deployment.name` and `k8s.node.name`, making pod name the bridge
 * between APM data and K8s infrastructure data.
 */
export async function getK8sInfraNames({
  podNames,
  infraMetricsClient,
  start,
  end,
}: {
  podNames: string[];
  infraMetricsClient: InfraMetricsClient;
  start: number;
  end: number;
}): Promise<{ deploymentNames: string[]; nodeNames: string[] }> {
  if (!podNames.length) {
    return { deploymentNames: [], nodeNames: [] };
  }

  const response = await infraMetricsClient.search({
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [{ terms: { [K8S_POD_NAME]: podNames } }, ...rangeQuery(start, end)],
      },
    },
    aggs: {
      deploymentNames: {
        terms: {
          field: K8S_DEPLOYMENT_NAME,
          size: 500,
        },
      },
      nodeNames: {
        terms: {
          field: K8S_NODE_NAME,
          size: 500,
        },
      },
    },
  });

  const deploymentNames =
    response.aggregations?.deploymentNames?.buckets.map((bucket) => bucket.key as string) ?? [];

  const nodeNames =
    response.aggregations?.nodeNames?.buckets.map((bucket) => bucket.key as string) ?? [];

  return { deploymentNames, nodeNames };
}
