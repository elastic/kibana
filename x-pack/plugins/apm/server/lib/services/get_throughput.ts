/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESFilter } from '../../../../../typings/elasticsearch';
import { PromiseReturnType } from '../../../../observability/typings/common';
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
import { calculateThroughput } from '../helpers/calculate_throughput';
import { Setup, SetupTimeRange } from '../helpers/setup_request';

interface Options {
  searchAggregatedTransactions: boolean;
  serviceName: string;
  setup: Setup & SetupTimeRange;
  transactionType: string;
}

type ESResponse = PromiseReturnType<typeof fetcher>;

function transform(options: Options, response: ESResponse) {
  if (response.hits.total.value === 0) {
    return [];
  }
  const { start, end } = options.setup;
  const buckets = response.aggregations?.throughput.buckets ?? [];
  return buckets.map(({ key: x, doc_count: value }) => ({
    x,
    y: calculateThroughput({ start, end, value }),
  }));
}

async function fetcher({
  searchAggregatedTransactions,
  serviceName,
  setup,
  transactionType,
}: Options) {
  const { start, end, apmEventClient } = setup;
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
        throughput: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: intervalString,
            min_doc_count: 0,
            extended_bounds: { min: start, max: end },
          },
        },
      },
    },
  };

  return apmEventClient.search(params);
}

export async function getThroughput(options: Options) {
  return {
    throughput: transform(options, await fetcher(options)),
  };
}
