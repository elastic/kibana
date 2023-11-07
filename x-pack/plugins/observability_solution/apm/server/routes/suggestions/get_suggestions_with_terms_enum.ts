/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { getProcessorEventForTransactions } from '../../lib/helpers/transactions';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getSuggestionsWithTermsEnum({
  fieldName,
  fieldValue,
  searchAggregatedTransactions,
  apmEventClient,
  size,
  start,
  end,
}: {
  fieldName: string;
  fieldValue: string;
  searchAggregatedTransactions: boolean;
  apmEventClient: APMEventClient;
  size: number;
  start: number;
  end: number;
}) {
  const response = await apmEventClient.termsEnum('get_suggestions', {
    apm: {
      events: [
        getProcessorEventForTransactions(searchAggregatedTransactions),
        ProcessorEvent.error,
        ProcessorEvent.metric,
      ],
    },
    case_insensitive: true,
    field: fieldName,
    size,
    string: fieldValue,
    index_filter: {
      range: {
        ['@timestamp']: {
          gte: start,
          lte: end,
          format: 'epoch_millis',
        },
      },
    },
  });

  return { terms: response.terms };
}
