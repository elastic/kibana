/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
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

type ServiceOverviewContainerMetadataDetails =
  | {
      kubernetes: {
        deployments?: string[];
        replicasets?: string[];
        namespaces?: string[];
        containerImages?: string[];
      };
    }
  | undefined;

interface ResponseAggregations {
  [key: string]: {
    buckets: Array<{
      key: string;
    }>;
  };
}

export const getServiceOverviewContainerMetadata = async ({
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
}): Promise<ServiceOverviewContainerMetadataDetails> => {
  if (!indexName) {
    return undefined;
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
    size: 0,
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
