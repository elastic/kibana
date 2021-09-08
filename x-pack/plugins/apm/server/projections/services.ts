/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup, SetupTimeRange } from '../../server/lib/helpers/setup_request';
import { SERVICE_NAME } from '../../common/elasticsearch_fieldnames';
import { rangeQuery, kqlQuery } from '../../../observability/server';
import { ProcessorEvent } from '../../common/processor_event';
import { getProcessorEventForAggregatedTransactions } from '../lib/helpers/aggregated_transactions';

export function getServicesProjection({
  kuery,
  setup,
  searchAggregatedTransactions,
}: {
  kuery: string;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
}) {
  const { start, end } = setup;

  return {
    apm: {
      events: [
        getProcessorEventForAggregatedTransactions(
          searchAggregatedTransactions
        ),
        ProcessorEvent.metric as const,
        ProcessorEvent.error as const,
      ],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [...rangeQuery(start, end), ...kqlQuery(kuery)],
        },
      },
      aggs: {
        services: {
          terms: {
            field: SERVICE_NAME,
          },
        },
      },
    },
  };
}
