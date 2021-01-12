/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AGENT_NAME,
  CLOUD_PROVIDER,
  CONTAINER_ID,
  KUBERNETES,
  SERVICE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { ContainerType } from '../../../common/service_metadata';
import { rangeFilter } from '../../../common/utils/range_filter';
import { TransactionRaw } from '../../../typings/es_schemas/raw/transaction_raw';
import {
  getProcessorEventForAggregatedTransactions,
  getDocumentTypeFilterForAggregatedTransactions,
} from '../helpers/aggregated_transactions';
import { Setup, SetupTimeRange } from '../helpers/setup_request';

type ServiceMetadataIconsRaw = Pick<
  TransactionRaw,
  'kubernetes' | 'cloud' | 'container' | 'agent'
>;

interface ServiceMetadataIcons {
  agentName?: string;
  containerType?: ContainerType;
  cloudProvider?: string;
}

export async function getServiceMetadataIcons({
  serviceName,
  setup,
  searchAggregatedTransactions,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
}): Promise<ServiceMetadataIcons> {
  const { start, end, apmEventClient } = setup;

  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    { range: rangeFilter(start, end) },
    ...getDocumentTypeFilterForAggregatedTransactions(
      searchAggregatedTransactions
    ),
  ];

  const params = {
    apm: {
      events: [
        getProcessorEventForAggregatedTransactions(
          searchAggregatedTransactions
        ),
      ],
    },
    terminateAfter: 1,
    body: {
      size: 1,
      _source: [KUBERNETES, CLOUD_PROVIDER, CONTAINER_ID, AGENT_NAME],
      query: { bool: { filter } },
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
}
