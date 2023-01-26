/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  AGENT_NAME,
  CLOUD_PROVIDER,
  CLOUD_SERVICE_NAME,
  CONTAINER_ID,
  KUBERNETES,
  SERVICE_NAME,
  KUBERNETES_POD_NAME,
  HOST_OS_PLATFORM,
} from '../../../common/es_fields/apm';
import { ContainerType } from '../../../common/service_metadata';
import { TransactionRaw } from '../../../typings/es_schemas/raw/transaction_raw';
import { getProcessorEventForTransactions } from '../../lib/helpers/transactions';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

type ServiceMetadataIconsRaw = Pick<
  TransactionRaw,
  'kubernetes' | 'cloud' | 'container' | 'agent'
>;

export interface ServiceMetadataIcons {
  agentName?: string;
  containerType?: ContainerType;
  serverlessType?: string;
  cloudProvider?: string;
}

export const should = [
  { exists: { field: CONTAINER_ID } },
  { exists: { field: KUBERNETES_POD_NAME } },
  { exists: { field: CLOUD_PROVIDER } },
  { exists: { field: HOST_OS_PLATFORM } },
  { exists: { field: AGENT_NAME } },
];

export async function getServiceMetadataIcons({
  serviceName,
  apmEventClient,
  searchAggregatedTransactions,
  start,
  end,
}: {
  serviceName: string;
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
}): Promise<ServiceMetadataIcons> {
  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    ...rangeQuery(start, end),
  ];

  const params = {
    apm: {
      events: [
        getProcessorEventForTransactions(searchAggregatedTransactions),
        ProcessorEvent.error,
        ProcessorEvent.metric,
      ],
    },
    body: {
      track_total_hits: 1,
      size: 1,
      _source: [
        KUBERNETES,
        CLOUD_PROVIDER,
        CONTAINER_ID,
        AGENT_NAME,
        CLOUD_SERVICE_NAME,
      ],
      query: { bool: { filter, should } },
    },
  };

  const response = await apmEventClient.search(
    'get_service_metadata_icons',
    params
  );

  if (response.hits.total.value === 0) {
    return {
      agentName: undefined,
      containerType: undefined,
      cloudProvider: undefined,
      serverlessType: undefined,
    };
  }

  const { kubernetes, cloud, container, agent } = response.hits.hits[0]
    ._source as ServiceMetadataIconsRaw;

  let containerType: ContainerType;
  if (!!kubernetes) {
    containerType = 'Kubernetes';
  } else if (!!container) {
    containerType = 'Docker';
  }

  let serverlessType: string | undefined;
  if (cloud?.provider === 'aws' && cloud?.service?.name === 'lambda') {
    serverlessType = 'lambda';
  }

  return {
    agentName: agent?.name,
    containerType,
    serverlessType,
    cloudProvider: cloud?.provider,
  };
}
