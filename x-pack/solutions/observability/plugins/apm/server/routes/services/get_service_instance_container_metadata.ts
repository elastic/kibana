/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { accessKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import {
  CONTAINER_ID,
  CONTAINER_IMAGE,
  KUBERNETES,
  KUBERNETES_POD_NAME,
  KUBERNETES_POD_UID,
  KUBERNETES_CONTAINER_NAME,
  KUBERNETES_REPLICASET_NAME,
  KUBERNETES_DEPLOYMENT_NAME,
  KUBERNETES_CONTAINER_ID,
  KUBERNETES_NAMESPACE,
} from '../../../common/es_fields/apm';
import type { Kubernetes } from '../../../typings/es_schemas/raw/fields/kubernetes';
import { maybe } from '../../../common/utils/maybe';
import type { InfraMetricsClient } from '../../lib/helpers/create_es_client/create_infra_metrics_client/create_infra_metrics_client';

export type ServiceInstanceContainerMetadataDetails =
  | {
      kubernetes: Kubernetes;
    }
  | undefined;

export const getServiceInstanceContainerMetadata = async ({
  infraMetricsClient,
  containerId,
  start,
  end,
}: {
  infraMetricsClient: InfraMetricsClient;
  containerId: string;
  start: number;
  end: number;
}): Promise<ServiceInstanceContainerMetadataDetails> => {
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

  const fields = asMutableArray([
    KUBERNETES_POD_NAME,
    KUBERNETES_POD_UID,
    KUBERNETES_DEPLOYMENT_NAME,
    KUBERNETES_CONTAINER_ID,
    KUBERNETES_CONTAINER_NAME,
    KUBERNETES_NAMESPACE,
    KUBERNETES_REPLICASET_NAME,
    KUBERNETES_DEPLOYMENT_NAME,
  ] as const);

  const response = await infraMetricsClient.search({
    size: 1,
    track_total_hits: false,
    fields,
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

  const hits = maybe(response.hits.hits[0])?.fields;

  const sample = hits && accessKnownApmEventFields(hits);

  return {
    kubernetes: {
      pod: {
        name: sample?.[KUBERNETES_POD_NAME],
        uid: sample?.[KUBERNETES_POD_UID],
      },
      deployment: {
        name: sample?.[KUBERNETES_DEPLOYMENT_NAME],
      },
      replicaset: {
        name: sample?.[KUBERNETES_REPLICASET_NAME],
      },
      namespace: sample?.[KUBERNETES_NAMESPACE],
      container: {
        name: sample?.[KUBERNETES_CONTAINER_NAME],
        id: sample?.[KUBERNETES_CONTAINER_ID],
      },
    },
  };
};
