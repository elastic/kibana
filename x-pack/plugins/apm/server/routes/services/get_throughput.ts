/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  kqlQuery,
  rangeQuery,
  termQuery,
} from '@kbn/observability-plugin/server';
import {
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../common/utils/environment_query';
import {
  getDocumentTypeFilterForTransactions,
  getProcessorEventForTransactions,
} from '../../lib/helpers/transactions';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';
import { getBucketSizeForAggregatedTransactions } from '../../lib/helpers/get_bucket_size_for_aggregated_transactions';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

interface Options {
  environment: string;
  kuery: string;
  searchAggregatedTransactions: boolean;
  serviceName: string;
  apmEventClient: APMEventClient;
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
  apmEventClient,
  transactionType,
  transactionName,
  start,
  end,
  offset,
}: Options) {
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
      track_total_hits: false,
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
