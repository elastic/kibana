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
} from '../../../common/elasticsearch_fieldnames';
import { rangeQuery } from '../../../server/utils/queries';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { getProcessorEventForAggregatedTransactions } from '../helpers/aggregated_transactions';

export async function getServiceAgentName({
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
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            ...rangeQuery(start, end),
          ],
        },
      },
      aggs: {
        agents: {
          terms: { field: AGENT_NAME, size: 1 },
        },
      },
    },
  };

  const { aggregations } = await apmEventClient.search(
    'get_service_agent_name',
    params
  );
  const agentName = aggregations?.agents.buckets[0]?.key as string | undefined;
  return { agentName };
}
