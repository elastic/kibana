/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '../../../common/processor_event';
import {
  AGENT_NAME,
  CLOUD_PROVIDER,
  CONTAINER_ID,
  KUBERNETES,
  SERVICE_NAME,
  POD_NAME,
  HOST_OS_PLATFORM,
} from '../../../common/elasticsearch_fieldnames';
import { ContainerType } from '../../../common/service_metadata';
import { rangeQuery } from '../../../common/utils/queries';
import { TransactionRaw } from '../../../typings/es_schemas/raw/transaction_raw';
import { getProcessorEventForAggregatedTransactions } from '../helpers/aggregated_transactions';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { withApmSpan } from '../../utils/with_apm_span';

type ServiceMetadataIconsRaw = Pick<
  TransactionRaw,
  'kubernetes' | 'cloud' | 'container' | 'agent'
>;

export interface ServiceMetadataIcons {
  agentName?: string;
  containerType?: ContainerType;
  cloudProvider?: string;
}

export const should = [
  { exists: { field: CONTAINER_ID } },
  { exists: { field: POD_NAME } },
  { exists: { field: CLOUD_PROVIDER } },
  { exists: { field: HOST_OS_PLATFORM } },
  { exists: { field: AGENT_NAME } },
];

export function getServiceMetadataIcons({
  serviceName,
  setup,
  searchAggregatedTransactions,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
}): Promise<ServiceMetadataIcons> {
  return withApmSpan('get_service_metadata_icons', async () => {
    const { start, end, apmEventClient } = setup;

    const filter = [
      { term: { [SERVICE_NAME]: serviceName } },
      ...rangeQuery(start, end),
    ];

    const params = {
      apm: {
        events: [
          getProcessorEventForAggregatedTransactions(
            searchAggregatedTransactions
          ),
          ProcessorEvent.error,
          ProcessorEvent.metric,
        ],
      },
      body: {
        size: 1,
        _source: [KUBERNETES, CLOUD_PROVIDER, CONTAINER_ID, AGENT_NAME],
        query: { bool: { filter, should } },
      },
    };

    const response = await apmEventClient.search(params);

    if (response.hits.total.value === 0) {
      return {
        agentName: undefined,
        containerType: undefined,
        cloudProvider: undefined,
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

    return {
      agentName: agent?.name,
      containerType,
      cloudProvider: cloud?.provider,
    };
  });
}
