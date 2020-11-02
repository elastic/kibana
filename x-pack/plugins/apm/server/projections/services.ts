/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup, SetupTimeRange } from '../../server/lib/helpers/setup_request';
import { SERVICE_NAME } from '../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../common/utils/range_filter';
import { ProcessorEvent } from '../../common/processor_event';
import { getProcessorEventForAggregatedTransactions } from '../lib/helpers/aggregated_transactions';

export function getServicesProjection({
  setup,
  searchAggregatedTransactions,
}: {
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
}) {
  const { start, end, esFilter } = setup;

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
          filter: [{ range: rangeFilter(start, end) }, ...esFilter],
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
