/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '../../../common/processor_event';
import {
  AGENT_EPHEMERAL_ID,
  SERVICE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { rangeQuery } from '../../../../observability/server';
import { Setup } from '../helpers/setup_request';
import { getProcessorEventForAggregatedTransactions } from '../helpers/aggregated_transactions';

export async function getServiceAgentIds({
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
}) {
  const { apmEventClient } = setup;

  const params = {
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
            {
              exists: {
                field: AGENT_EPHEMERAL_ID,
              },
            },
          ],
        },
      },
      aggs: {
        agents: {
          terms: { field: AGENT_EPHEMERAL_ID },
        },
      },
    },
  };

  const response = await apmEventClient.search('get_service_agent_ids', params);

  return (
    response.aggregations?.agents?.buckets?.map(
      (bucket) => bucket.key as string
    ) ?? []
  );
}
