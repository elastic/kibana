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
  PROCESSOR_EVENT,
  SERVICE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { rangeFilter } from '../../../common/utils/range_filter';
import { TransactionRaw } from '../../../typings/es_schemas/raw/transaction_raw';
import { Setup, SetupTimeRange } from '../helpers/setup_request';

type ServiceMetadataIconsRaw = Pick<
  TransactionRaw,
  'kubernetes' | 'cloud' | 'container' | 'agent'
>;

interface ServiceMetadataIcons {
  agentName?: string;
  container?: 'Kubernetes' | 'Docker' | undefined;
  cloud?: string;
}

export async function getServiceMetadataIcons({
  serviceName,
  setup,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
}): Promise<ServiceMetadataIcons> {
  const { start, end, apmEventClient } = setup;

  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
    { range: rangeFilter(start, end) },
    ...setup.esFilter,
  ];

  const params = {
    apm: {
      events: [ProcessorEvent.transaction],
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
      container: undefined,
      cloud: undefined,
    };
  }

  const { kubernetes, cloud, container, agent } = response.hits.hits[0]
    ._source as ServiceMetadataIconsRaw;

  let containerType: ServiceMetadataIcons['container'];
  if (!!kubernetes) {
    containerType = 'Kubernetes';
  } else if (!!container) {
    containerType = 'Docker';
  }

  return {
    agentName: agent?.name,
    container: containerType,
    cloud: cloud?.provider,
  };
}
