/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { SERVICE_NAME, TRANSACTION_TYPE } from '../../../common/es_fields/apm';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import {
  getDocumentTypeFilterForTransactions,
  getProcessorEventForTransactions,
} from '../../lib/helpers/transactions';

export async function getServiceTransactionTypes({
  apmEventClient,
  serviceName,
  searchAggregatedTransactions,
  start,
  end,
}: {
  serviceName: string;
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  start: number;
  end: number;
}) {
  const params = {
    apm: {
      events: [getProcessorEventForTransactions(searchAggregatedTransactions)],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...getDocumentTypeFilterForTransactions(
              searchAggregatedTransactions
            ),
            { term: { [SERVICE_NAME]: serviceName } },
            ...rangeQuery(start, end),
          ],
        },
      },
      aggs: {
        types: {
          terms: { field: TRANSACTION_TYPE, size: 100 },
        },
      },
    },
  };

  const { aggregations } = await apmEventClient.search(
    'get_service_transaction_types',
    params
  );
  const transactionTypes =
    aggregations?.types.buckets.map((bucket) => bucket.key as string) || [];
  return { transactionTypes };
}
