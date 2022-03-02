/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ProcessorEvent } from '../../../common/processor_event';
import { rangeQuery } from '../../../../observability/server';
import { Setup } from '../../lib/helpers/setup_request';

export async function getSuggestionsWithTerm({
  field,
  filter,
  setup,
  size,
  string,
  start,
  end,
}: {
  field: string;
  filter: QueryDslQueryContainer[];
  setup: Setup;
  size: number;
  string: string;
  start?: number;
  end?: number;
}) {
  const { apmEventClient } = setup;

  const response = await apmEventClient.search('get_suggestions_with_terms', {
    apm: {
      events: [
        ProcessorEvent.transaction,
        ProcessorEvent.error,
        ProcessorEvent.metric,
      ],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            ...filter,
            ...(start && end ? rangeQuery(start, end) : []),
            {
              query_string: {
                fields: [field],
                query: `*${string}*`,
              },
            },
          ],
        },
      },
      aggs: {
        items: {
          terms: { field, size },
        },
      },
    },
  });

  return {
    terms: response.aggregations.items.buckets.map((bucket) => bucket.key),
  };
}
