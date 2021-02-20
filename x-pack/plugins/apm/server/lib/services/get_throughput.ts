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
import { environmentQuery, rangeQuery } from '../../../common/utils/queries';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
} from '../helpers/aggregated_transactions';
import { getBucketSize } from '../helpers/get_bucket_size';
import { Setup } from '../helpers/setup_request';
import { withApmSpan } from '../../utils/with_apm_span';

interface Options {
  environment?: string;
  searchAggregatedTransactions: boolean;
  serviceName: string;
  setup: Setup;
  transactionType: string;
  start: number;
  end: number;
}

function fetcher({
  environment,
  searchAggregatedTransactions,
  serviceName,
  setup,
  transactionType,
  start,
  end,
}: Options) {
  const { esFilter, apmEventClient } = setup;
  const { intervalString } = getBucketSize({ start, end });
  const filter: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [TRANSACTION_TYPE]: transactionType } },
    ...getDocumentTypeFilterForAggregatedTransactions(
      searchAggregatedTransactions
    ),
    ...rangeQuery(start, end),
    ...environmentQuery(environment),
    ...esFilter,
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
        timeseries: {
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

export function getThroughput(options: Options) {
  return withApmSpan('get_throughput_for_service', async () => {
    const response = await fetcher(options);

    return (
      response.aggregations?.timeseries.buckets.map((bucket) => {
        return {
          x: bucket.key,
          y: bucket.throughput.value,
        };
      }) ?? []
    );
  });
}
