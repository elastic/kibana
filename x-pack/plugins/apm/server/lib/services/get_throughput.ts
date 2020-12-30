/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
import { Setup, SetupTimeRange } from '../helpers/setup_request';

interface Options {
  searchAggregatedTransactions: boolean;
  serviceName: string;
  setup: Setup & SetupTimeRange;
  transactionType: string;
}

type ESResponse = PromiseReturnType<typeof fetcher>;

function transform(response: ESResponse) {
  const buckets = response.aggregations?.throughput?.buckets ?? [];
  return buckets.map(({ key: x, doc_count: y }) => ({ x, y }));
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
    throughput: transform(await fetcher(options)),
  };
}
