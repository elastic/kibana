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
import { Kubernetes } from '../../../typings/es_schemas/raw/fields/kubernetes';
import { maybe } from '../../../common/utils/maybe';

type ServiceInstanceContainerMetadataDetails =
  | {
      kubernetes: Kubernetes;
    }
  | undefined;

export const getServiceInstanceContainerMetadata = async ({
  esClient,
  indexName,
  containerId,
  start,
  end,
}: {
  esClient: ElasticsearchClient;
  indexName?: string;
  containerId: string;
  start: number;
  end: number;
}): Promise<ServiceInstanceContainerMetadataDetails> => {
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

  const response = await esClient.search<unknown>({
    index: [indexName],
    _source: [KUBERNETES, CONTAINER],
    size: 1,
    query: {
      bool: {
        filter: [
          {
            term: {
              [CONTAINER_ID]: containerId,
            },
          },
          ...rangeQuery(start, end),
        ],
        should,
      },
    },
  });

  const sample = maybe(response.hits.hits[0])
    ?._source as ServiceInstanceContainerMetadataDetails;

  return {
    kubernetes: {
      pod: {
        name: sample?.kubernetes?.pod?.name,
        uid: sample?.kubernetes?.pod?.uid,
      },
      deployment: {
        name: sample?.kubernetes?.deployment?.name,
      },
      replicaset: {
        name: sample?.kubernetes?.replicaset?.name,
      },
      namespace: sample?.kubernetes?.namespace,
      container: {
        name: sample?.kubernetes?.container?.name,
        id: sample?.kubernetes?.container?.id,
      },
    },
  };
};
