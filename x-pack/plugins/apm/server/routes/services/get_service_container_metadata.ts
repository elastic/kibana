/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { rangeQuery } from '@kbn/observability-plugin/server';
import {
  CONTAINER,
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
import { Kubernetes } from '../../../typings/es_schemas/raw/fields/kubernetes';
import { Container } from '../../../typings/es_schemas/raw/fields/container';

export interface ContainerMetadata {
  kubernetes?: Kubernetes;
  container?: Container;
}
interface Buckets {
  buckets: Array<{
    key: string;
  }>;
}
interface ResponseAggregations {
  deployment: Buckets;
  replicaset: Buckets;
  namespace: Buckets;
  top_metrics: estypes.AggregationsTopMetricsAggregate;
}

export const getServiceContainerMetadata = async ({
  esClient,
  indexName,
  containerIds,
  start,
  end,
}: {
  esClient: ElasticsearchClient;
  indexName?: string;
  containerIds: string[];
  start: number;
  end: number;
}): Promise<ContainerMetadata> => {
  if (!indexName) {
    return {};
  }

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

  const response = await esClient.search<unknown, ResponseAggregations>({
    index: [indexName],
    _source: [KUBERNETES, CONTAINER],
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
      top_metrics: {
        top_metrics: {
          metrics: [
            {
              field: KUBERNETES_POD_NAME,
            },
            {
              field: KUBERNETES_POD_UID,
            },
            {
              field: CONTAINER_ID,
            },
            {
              field: CONTAINER_IMAGE,
            },
          ],
          sort: {
            '@timestamp': 'desc',
          },
        },
      },
      deployment: {
        terms: {
          field: KUBERNETES_DEPLOYMENT_NAME,
          size: 10,
        },
      },
      namespace: {
        terms: {
          field: KUBERNETES_NAMESPACE,
          size: 10,
        },
      },
      replicaset: {
        terms: {
          field: KUBERNETES_REPLICASET_NAME,
          size: 10,
        },
      },
    },
  });

  const metrics = response.aggregations?.top_metrics?.top[0]?.metrics;

  return {
    kubernetes: {
      pod: {
        name: metrics?.[KUBERNETES_POD_NAME] as string | null,
        uid: metrics?.[KUBERNETES_POD_UID] as string | null,
      },
      deployment: response.aggregations?.deployment?.buckets.map(
        (bucket) => bucket.key
      ),
      replicaset: response.aggregations?.replicaset?.buckets.map(
        (bucket) => bucket.key
      ),
      namespace: response.aggregations?.namespace?.buckets.map(
        (bucket) => bucket.key
      ),
    },
    container: {
      image: metrics?.[CONTAINER_IMAGE] as string | null,
      id: metrics?.[CONTAINER_ID] as string | null,
    },
  };
};
