/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getThroughputUnit } from '../../../common/calculate_throughput';
import { ESFilter } from '../../../../../../src/core/types/elasticsearch';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import {
  environmentQuery,
  kqlQuery,
  rangeQuery,
} from '../../../server/utils/queries';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
} from '../helpers/aggregated_transactions';
import { getBucketSizeForAggregatedTransactions } from '../helpers/get_bucket_size_for_aggregated_transactions';
import { Setup } from '../helpers/setup_request';

interface Options {
  environment?: string;
  kuery?: string;
  searchAggregatedTransactions: boolean;
  serviceName: string;
  setup: Setup;
  transactionType: string;
  start: number;
  end: number;
}

export async function getThroughput({
  environment,
  kuery,
  searchAggregatedTransactions,
  serviceName,
  setup,
  transactionType,
  start,
  end,
}: Options) {
  const { apmEventClient } = setup;
  const {
    bucketSizeString,
    bucketSize,
  } = getBucketSizeForAggregatedTransactions({
    start,
    end,
    searchAggregatedTransactions,
  });
  const filter: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [TRANSACTION_TYPE]: transactionType } },
    ...getDocumentTypeFilterForAggregatedTransactions(
      searchAggregatedTransactions
    ),
    ...rangeQuery(start, end),
    ...environmentQuery(environment),
    ...kqlQuery(kuery),
  ];

  const throughputUnit = getThroughputUnit(bucketSize);

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
        timeseries: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: bucketSizeString,
            min_doc_count: 0,
            extended_bounds: { min: start, max: end },
          },
          aggs: {
            throughput: {
              rate: {
                unit: throughputUnit,
              },
            },
          },
        },
      },
    },
  };

  const response = await apmEventClient.search(
    'get_throughput_for_service',
    params
  );

  return {
    unit: throughputUnit,
    timeseries:
      response.aggregations?.timeseries.buckets.map((bucket) => {
        return {
          x: bucket.key,
          y: bucket.throughput.value,
        };
      }) ?? [],
  };
}
