/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '../../../common/processor_event';
import {
  AGENT_NAME,
  SERVICE_NAME,
  SERVICE_RUNTIME_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { rangeQuery } from '../../../../observability/server';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { getProcessorEventForAggregatedTransactions } from '../helpers/aggregated_transactions';

interface ServiceAgent {
  service?: {
    runtime: {
      name: string;
    };
  };
  agent?: {
    name: string;
  };
}

export async function getServiceAgent({
  serviceName,
  setup,
  searchAggregatedTransactions,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
}) {
  const { start, end, apmEventClient } = setup;

  const params = {
    terminateAfter: 1,
    apm: {
      events: [
        ProcessorEvent.error,
        getProcessorEventForAggregatedTransactions(
          searchAggregatedTransactions
        ),
        ProcessorEvent.metric,
      ],
    },
    body: {
      size: 1,
      _source: [SERVICE_RUNTIME_NAME, AGENT_NAME],
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            ...rangeQuery(start, end),
            {
              exists: {
                field: SERVICE_RUNTIME_NAME,
              },
            },
            {
              exists: {
                field: AGENT_NAME,
              },
            },
          ],
        },
      },
    },
  };

  const response = await apmEventClient.search(
    'get_service_agent_name',
    params
  );
  if (response.hits.total.value === 0) {
    return {};
  }

  const { service, agent } = response.hits.hits[0]._source as ServiceAgent;
  return { agentName: agent?.name, runtimeName: service?.runtime.name };
}
