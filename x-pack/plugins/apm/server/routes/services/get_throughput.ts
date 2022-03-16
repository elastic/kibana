/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import {
  kqlQuery,
  rangeQuery,
  termQuery,
} from '../../../../observability/server';
import { environmentQuery } from '../../../common/utils/environment_query';
import {
  getDocumentTypeFilterForTransactions,
  getProcessorEventForTransactions,
} from '../../lib/helpers/transactions';
import { Setup } from '../../lib/helpers/setup_request';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';
import { getBucketSizeForAggregatedTransactions } from '../../lib/helpers/get_bucket_size_for_aggregated_transactions';

interface Options {
  environment: string;
  kuery: string;
  searchAggregatedTransactions: boolean;
  serviceName: string;
  setup: Setup;
  transactionType: string;
  transactionName?: string;
  start: number;
  end: number;
  offset?: string;
}

export async function getThroughput({
  environment,
  kuery,
  searchAggregatedTransactions,
  serviceName,
  setup,
  transactionType,
  transactionName,
  start,
  end,
  offset,
}: Options) {
  const { apmEventClient } = setup;

  const { startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const { intervalString } = getBucketSizeForAggregatedTransactions({
    start: startWithOffset,
    end: endWithOffset,
    searchAggregatedTransactions,
  });

  const params = {
    apm: {
      events: [getProcessorEventForTransactions(searchAggregatedTransactions)],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [TRANSACTION_TYPE]: transactionType } },
            ...getDocumentTypeFilterForTransactions(
              searchAggregatedTransactions
            ),
            ...rangeQuery(startWithOffset, endWithOffset),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...termQuery(TRANSACTION_NAME, transactionName),
          ],
        },
      },
      aggs: {
        timeseries: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: intervalString,
            min_doc_count: 0,
            extended_bounds: { min: startWithOffset, max: endWithOffset },
          },
          aggs: {
            throughput: {
              rate: { unit: 'minute' as const },
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

  return (
    response.aggregations?.timeseries.buckets.map((bucket) => {
      return {
        x: bucket.key,
        y: bucket.throughput.value,
      };
    }) ?? []
  );
}
