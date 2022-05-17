/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '../../../common/processor_event';
import {
  AGENT_NAME,
  CLOUD_PROVIDER,
  CLOUD_SERVICE_NAME,
  CONTAINER,
  KUBERNETES,
  SERVICE_NAME,
  POD_NAME,
  HOST_OS_PLATFORM,
  CONTAINER_ID,
  CONTAINER_IMAGE,
} from '../../../common/elasticsearch_fieldnames';
import { ContainerType } from '../../../common/service_metadata';
import { TransactionRaw } from '../../../typings/es_schemas/raw/transaction_raw';
import { getProcessorEventForTransactions } from '../../lib/helpers/transactions';
import { Setup } from '../../lib/helpers/setup_request';

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
  { exists: { field: POD_NAME } },
  { exists: { field: CLOUD_PROVIDER } },
  { exists: { field: HOST_OS_PLATFORM } },
  { exists: { field: AGENT_NAME } },
  { exists: { field: CONTAINER_IMAGE } },
];

export async function getServiceMetadataIcons({
  serviceName,
  setup,
  searchAggregatedTransactions,
  start,
  end,
}: {
  serviceName: string;
  setup: Setup;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
}): Promise<ServiceMetadataIcons> {
  const { apmEventClient } = setup;

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
      size: 1,
      _source: [
        KUBERNETES,
        CLOUD_PROVIDER,
        CONTAINER,
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
