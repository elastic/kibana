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
  KUBERNETES_LABELS,
} from '../../../common/elasticsearch_fieldnames';
import { Kubernetes } from '../../../typings/es_schemas/raw/fields/kubernetes';
import { Container } from '../../../typings/es_schemas/raw/fields/container';
import { maybe } from '../../../common/utils/maybe';

export interface ContainerMetadata {
  kubernetes?: Kubernetes;
  container?: Container;
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
    { exists: { field: KUBERNETES_LABELS } },
  ];

  const response = await esClient.search({
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
      labels: {
        terms: { field: KUBERNETES_DEPLOYMENT_NAME },
        aggs: {
          all_labels: {
            top_hits: {
              _source: [KUBERNETES_LABELS],
              size: 1,
            },
          },
        },
      },
    },
  });

  const sources = maybe(response.hits.hits[0])?._source;

  const allLabels = response.aggregations?.labels?.buckets.map(
    (bucket) => bucket.all_labels.hits.hits[0]._source.kubernetes.labels
  );

  return {
    kubernetes: {
      pod: {
        name: sources?.kubernetes?.pod.name,
        uid: sources?.kubernetes?.pod.uid,
      },
      deployment: response.aggregations?.deployments?.buckets.map(
        (bucket) => bucket.key as string
      ),
      replicaset: response.aggregations?.replicasets?.buckets.map(
        (bucket) => bucket.key as string
      ),
      namespace: response.aggregations?.namespaces?.buckets.map(
        (bucket) => bucket.key as string
      ),
      labels: allLabels
        .map((label) => Object.keys(label).map((key) => `${key}:${label[key]}`))
        .flat(),
    },
    container: {
      image: sources?.container.image.name,
      id: sources?.container.id,
    },
  };
};
