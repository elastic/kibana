/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Setup } from '../../../lib/helpers/setup_request';
import { ProcessorEvent } from '../../../../common/processor_event';
import { SERVICE_NAME } from '../../../../common/elasticsearch_fieldnames';
import { rangeQuery } from '../../../../../observability/server';
import { environmentQuery } from '../../../../common/utils/environment_query';

export async function getTotalTransactionsPerService({
  setup,
  start,
  end,
  environment,
}: {
  setup: Setup;
  start: number;
  end: number;
  environment: string;
}) {
  const { apmEventClient } = setup;

  const response = await apmEventClient.search('get_total_transactions', {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
          ] as QueryDslQueryContainer[],
        },
      },
      aggs: {
        services: {
          terms: {
            field: SERVICE_NAME,
            size: 10,
          },
        },
      },
    },
  });

  return (
    response.aggregations?.services.buckets.reduce(
      (transactionsPerService, bucket) => {
        transactionsPerService[bucket.key as string] = bucket.doc_count;
        return transactionsPerService;
      },
      {} as Record<string, number>
    ) ?? {}
  );
}
