/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '../../../common/processor_event';
import { getProcessorEventForAggregatedTransactions } from '../helpers/aggregated_transactions';
import { Setup } from '../helpers/setup_request';

export async function getSuggestions({
  field,
  searchAggregatedTransactions,
  setup,
  size,
  string,
}: {
  field: string;
  searchAggregatedTransactions: boolean;
  setup: Setup;
  size: number;
  string: string;
}) {
  const { apmEventClient } = setup;

  const response = await apmEventClient.termsEnum('get_suggestions', {
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
      case_insensitive: true,
      field,
      size,
      string,
    },
  });

  return { terms: response.terms };
}
