/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { ProcessorEvent } from '../../../common/processor_event';
import { getProcessorEventForTransactions } from '../../lib/helpers/transactions';
import { SERVICE_NAME } from '../../../common/elasticsearch_fieldnames';
import { rangeQuery, termQuery } from '../../../../observability/server';
import { Setup } from '../../lib/helpers/setup_request';

export async function getSuggestionsWithTermsAggregation({
  fieldName,
  fieldValue,
  searchAggregatedTransactions,
  serviceName,
  setup,
  size,
  start = moment().subtract(24, 'h').valueOf(),
  end = moment().valueOf(),
}: {
  fieldName: string;
  fieldValue: string;
  searchAggregatedTransactions: boolean;
  serviceName: string;
  setup: Setup;
  size: number;
  start?: number;
  end?: number;
}) {
  const { apmEventClient } = setup;

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
