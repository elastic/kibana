/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESFilter } from '../../../../../typings/elasticsearch';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../../common/utils/range_filter';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
} from '../helpers/aggregated_transactions';
import { getBucketSize } from '../helpers/get_bucket_size';
import { Setup } from '../helpers/setup_request';

interface Options {
  searchAggregatedTransactions: boolean;
  serviceName: string;
  setup: Setup;
  transactionType: string;
  start: number;
  end: number;
}

function fetcher({
  searchAggregatedTransactions,
  serviceName,
  setup,
  transactionType,
  start,
  end,
}: Options) {
  const { apmEventClient } = setup;
  const { intervalString } = getBucketSize({ start, end });
  const filter: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [TRANSACTION_TYPE]: transactionType } },
    { range: rangeFilter(start, end) },
    ...getDocumentTypeFilterForAggregatedTransactions(
      searchAggregatedTransactions
    ),
    ...setup.esFilter,
  ];

  const params = {
    apm: {
      events: [
        getProcessorEventForAggregatedTransactions(
          searchAggregatedTransactions
        ),
      ],
    },
    body: {
      size: 0,
      query: { bool: { filter } },
      aggs: {
        transactions: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: intervalString,
            min_doc_count: 0,
            extended_bounds: { min: start, max: end },
          },
          aggs: {
            throughput: {
              rate: {
                unit: 'minute' as const,
              },
            },
          },
        },
      },
    },
  };

  return apmEventClient.search(params);
}

export async function getThroughput(options: Options) {
  const response = await fetcher(options);

  return (
    response.aggregations?.transactions.buckets.map((bucket) => {
      return {
        x: bucket.key,
        y: bucket.throughput.value,
      };
    }) ?? []
  );
}
