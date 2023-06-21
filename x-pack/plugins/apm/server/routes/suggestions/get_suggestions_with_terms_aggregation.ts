/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { getProcessorEventForTransactions } from '../../lib/helpers/transactions';
import { SERVICE_NAME } from '../../../common/es_fields/apm';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getSuggestionsWithTermsAggregation({
  fieldName,
  fieldValue,
  searchAggregatedTransactions,
  serviceName,
  apmEventClient,
  size,
  start,
  end,
}: {
  fieldName: string;
  fieldValue: string;
  searchAggregatedTransactions: boolean;
  serviceName?: string;
  apmEventClient: APMEventClient;
  size: number;
  start: number;
  end: number;
}) {
  const response = await apmEventClient.search(
    'get_suggestions_with_terms_aggregation',
    {
      apm: {
        events: [
          getProcessorEventForTransactions(searchAggregatedTransactions),
          ProcessorEvent.error,
          ProcessorEvent.metric,
        ],
      },
      body: {
        track_total_hits: false,
        timeout: '1500ms',
        size: 0,
        query: {
          bool: {
            filter: [
              ...termQuery(SERVICE_NAME, serviceName),
              ...rangeQuery(start, end),
              {
                wildcard: {
                  [fieldName]: `*${fieldValue}*`,
                },
              },
            ],
          },
        },
        aggs: {
          items: {
            terms: { field: fieldName, size },
          },
        },
      },
    }
  );

  return {
    terms:
      response.aggregations?.items.buckets.map(
        (bucket) => bucket.key as string
      ) ?? [],
  };
}
