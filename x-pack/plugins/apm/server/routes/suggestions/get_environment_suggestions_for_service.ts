/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ProcessorEvent } from '../../../common/processor_event';
import { SERVICE_NAME } from '../../../common/elasticsearch_fieldnames';
import { rangeQuery, termQuery } from '../../../../observability/server';
import { Setup } from '../../lib/helpers/setup_request';

export async function getSuggestionsByServiceName({
  fieldName,
  fieldValue,
  serviceName,
  setup,
  size,
  start,
  end,
}: {
  fieldName: string;
  fieldValue: string;
  serviceName: string;
  setup: Setup;
  size: number;
  start?: number;
  end?: number;
}) {
  const { apmEventClient } = setup;

  const response = await apmEventClient.search(
    'get_environment_suggestions_for_service',
    {
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
              ...termQuery(SERVICE_NAME, serviceName),
              ...(start && end ? rangeQuery(start, end) : []),
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
