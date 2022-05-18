/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SearchResponse } from '@kbn/core/server';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { maybe } from '../../../../common/utils/maybe';

import {
  CONTAINER,
  CONTAINER_ID,
  CONTAINER_IMAGE,
  KUBERNETES,
  K8s_CONTAINER_NAME,
  POD_NAME,
  POD_UID,
  REPLICASET_NAME,
  DEPLOYMENT_NAME,
  NAMESPACE,
  K8s_LABELS,
} from '../../../../common/elasticsearch_fieldnames';
import { Kubernetes } from '../../../../typings/es_schemas/raw/fields/kubernetes';
export interface KubernetesMetadataDetails {
  kubernetes?: Kubernetes;
}

type ESResponse = SearchResponse;

export const getServiceKubernetesMetadata = async ({
  esClient,
  index,
  containerIds,
  start,
  end,
}: {
  esClient: ElasticsearchClient;
  index?: string;
  containerIds: string[];
  start: number;
  end: number;
}): Promise<KubernetesMetadataDetails> => {
  // includeFrozen ?

  const should = [
    { exists: { field: KUBERNETES } },
    { exists: { field: K8s_CONTAINER_NAME } },
    { exists: { field: NAMESPACE } },
    { exists: { field: POD_NAME } },
    { exists: { field: POD_UID } },
    { exists: { field: REPLICASET_NAME } },
    { exists: { field: DEPLOYMENT_NAME } },
    { exists: { field: K8s_LABELS } },
    { exists: { field: CONTAINER_IMAGE } },
  ];

  if (!index) {
    return {};
  }

  const response = await esClient.search<ESResponse>({
    index: [index],
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
      deploymentNames: {
        terms: {
          field: DEPLOYMENT_NAME,
          size: 10,
        },
      },
      namespaceNames: {
        terms: {
          field: NAMESPACE,
          size: 10,
        },
      },
      replicasetNames: {
        terms: {
          field: REPLICASET_NAME,
          size: 10,
        },
      },
      labels: {
        terms: { field: DEPLOYMENT_NAME, size: 10 },
        aggs: {
          all_labels: {
            top_hits: {
              _source: [K8s_LABELS],
              size: 1,
            },
          },
        },
      },
    },
  });

  if (response.hits.total.value === 0) {
    return {};
  }

  const sources = maybe(response.hits.hits[0])?._source;

  const allLabels = response.aggregations?.labels?.buckets.map(
    (bucket) => bucket.all_labels.hits.hits[0]._source.kubernetes.labels
  );

  return {
    kubernetes: {
      container: {
        name: sources?.kubernetes?.container.name,
        id: sources?.kubernetes?.container.id,
        image: sources?.container.image.name,
      },
      pod: {
        name: sources?.kubernetes?.pod.name,
        uid: sources?.kubernetes?.pod.uid,
      },
      deployment: response.aggregations?.deploymentNames?.buckets.map(
        (bucket) => bucket.key as string
      ),
      replicaset: response.aggregations?.replicasetNames?.buckets.map(
        (bucket) => bucket.key as string
      ),
      namespace: response.aggregations?.namespaceNames?.buckets.map(
        (bucket) => bucket.key as string
      ),
      labels: allLabels
        .map((label) => Object.keys(label).map((key) => `${key}:${label[key]}`))
        .flat(),
    },
    container: {
      image: { name: sources?.container.image.name },
      id: sources?.container.id,
    },
  };
};
