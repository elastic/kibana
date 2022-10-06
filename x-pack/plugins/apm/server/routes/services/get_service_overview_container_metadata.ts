/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import {
  CONTAINER_ID,
  CONTAINER_IMAGE,
  KUBERNETES,
  KUBERNETES_CONTAINER_NAME,
  KUBERNETES_NAMESPACE,
  KUBERNETES_POD_NAME,
  KUBERNETES_POD_UID,
  KUBERNETES_REPLICASET_NAME,
  KUBERNETES_DEPLOYMENT_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { InfraMetricsClient } from '../../lib/helpers/create_es_client/create_infra_metrics_client/create_infra_metrics_client';

export const getServiceOverviewContainerMetadata = async ({
  infraMetricsClient,
  containerIds,
  start,
  end,
}: {
  infraMetricsClient: InfraMetricsClient;
  containerIds: string[];
  start: number;
  end: number;
}) => {
  const should = [
    { exists: { field: KUBERNETES } },
    { exists: { field: CONTAINER_IMAGE } },
    { exists: { field: KUBERNETES_CONTAINER_NAME } },
    { exists: { field: KUBERNETES_NAMESPACE } },
    { exists: { field: KUBERNETES_POD_NAME } },
    { exists: { field: KUBERNETES_POD_UID } },
    { exists: { field: KUBERNETES_REPLICASET_NAME } },
    { exists: { field: KUBERNETES_DEPLOYMENT_NAME } },
  ];

  const response = await infraMetricsClient.search({
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          {
            terms: {
              [CONTAINER_ID]: containerIds,
            },
          },
          ...rangeQuery(start, end),
        ],
        should,
      },
    },
    aggs: {
      deployments: {
        terms: {
          field: KUBERNETES_DEPLOYMENT_NAME,
          size: 10,
        },
      },
      namespaces: {
        terms: {
          field: KUBERNETES_NAMESPACE,
          size: 10,
        },
      },
      replicasets: {
        terms: {
          field: KUBERNETES_REPLICASET_NAME,
          size: 10,
        },
      },
      containerImages: {
        terms: {
          field: CONTAINER_IMAGE,
          size: 10,
        },
      },
    },
  });

  return {
    kubernetes: {
      deployments: response.aggregations?.deployments?.buckets.map(
        (bucket) => bucket.key
      ),
      replicasets: response.aggregations?.replicasets?.buckets.map(
        (bucket) => bucket.key
      ),
      namespaces: response.aggregations?.namespaces?.buckets.map(
        (bucket) => bucket.key
      ),
      containerImages: response.aggregations?.containerImages?.buckets.map(
        (bucket) => bucket.key
      ),
    },
  };
};
