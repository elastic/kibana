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
  REPLICASET,
  DEPLOYMENT_NAME,
  NAMESPACE,
  K8s_LABELS,
} from '../../../../common/elasticsearch_fieldnames';
import { Kubernetes } from '../../../../typings/es_schemas/raw/fields/kubernetes';
export interface KubernetesMetadataDetails {
  kubernetes?: Kubernetes;
}

type ESResponse = SearchResponse;

export const getServiceContainerMetadata = async ({
  esClient,
  index,
  containerId,
  start,
  end,
}: {
  esClient: ElasticsearchClient;
  index?: string;
  containerId: string;
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
    { exists: { field: REPLICASET } },
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
            term: { [CONTAINER_ID]: containerId },
          },
          ...rangeQuery(start, end),
        ],
        should,
      },
    },
  });

  const sources = maybe(response.hits.hits[0])?._source;

  if (response.hits.total.value === 0) {
    return {};
  }

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
      deployment: sources?.kubernetes?.deployment,
      replicaset: sources?.kubernetes?.replicaset,
      namespace: { name: sources?.kubernetes?.namespace },
      labels: Object.entries(sources?.kubernetes?.labels).map(
        ([label, value]) => label.concat(':', value)
      ),
    },
    container: {
      image: { name: sources?.container.image.name },
      id: sources?.container.id,
    },
  };
};
