/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '../../../common/processor_event';
import { getProcessorEventForTransactions } from '../../lib/helpers/transactions';
import { Setup } from '../../lib/helpers/setup_request';

export async function getSuggestions({
  fieldName,
  fieldValue,
  searchAggregatedTransactions,
  setup,
  size,
  start,
  end,
}: {
  fieldName: string;
  fieldValue: string;
  searchAggregatedTransactions: boolean;
  setup: Setup;
  size: number;
  start?: number;
  end?: number;
}) {
  const { apmEventClient } = setup;

  const response = await apmEventClient.termsEnum('get_suggestions', {
    apm: {
      events: [
        getProcessorEventForTransactions(searchAggregatedTransactions),
        ProcessorEvent.error,
        ProcessorEvent.metric,
      ],
    },
    body: {
      case_insensitive: true,
      field: fieldName,
      size,
      string: fieldValue,
      ...(start &&
        end && {
          index_filter: {
            range: {
              ['@timestamp']: {
                gte: start,
                lte: end,
                format: 'epoch_millis',
              },
            },
          },
        }),
    },
  });

  return { terms: response.terms };
}
