/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  ERROR_GROUP_ID,
  SERVICE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { getMetricsDateHistogramParams } from '../helpers/metrics';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';
import { rangeFilter } from '../../../common/utils/range_filter';

export async function getErrorRate({
  serviceName,
  groupId,
  setup,
}: {
  serviceName: string;
  groupId?: string;
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  const { start, end, uiFiltersES, client } = setup;

  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    { range: rangeFilter(start, end) },
    ...uiFiltersES,
  ];

  const aggs = {
    response_times: {
      date_histogram: getMetricsDateHistogramParams(start, end),
    },
  };

  const getTransactionBucketAggregation = async () => {
    const resp = await client.search({
      apm: {
        types: [ProcessorEvent.transaction],
      },
      body: {
        size: 0,
        query: {
          bool: {
            filter,
          },
        },
        aggs,
      },
    });

    return {
      totalHits: resp.hits.total.value,
      responseTimeBuckets: resp.aggregations?.response_times.buckets,
    };
  };
  const getErrorBucketAggregation = async () => {
    const groupIdFilter = groupId
      ? [{ term: { [ERROR_GROUP_ID]: groupId } }]
      : [];
    const resp = await client.search({
      apm: {
        types: [ProcessorEvent.error],
      },
      body: {
        size: 0,
        query: {
          bool: {
            filter: [...filter, ...groupIdFilter],
          },
        },
        aggs,
      },
    });
    return resp.aggregations?.response_times.buckets;
  };

  const [transactions, errorResponseTimeBuckets] = await Promise.all([
    getTransactionBucketAggregation(),
    getErrorBucketAggregation(),
  ]);

  const transactionCountByTimestamp: Record<number, number> = {};
  if (transactions?.responseTimeBuckets) {
    transactions.responseTimeBuckets.forEach((bucket) => {
      transactionCountByTimestamp[bucket.key] = bucket.doc_count;
    });
  }

  const errorRates = errorResponseTimeBuckets?.map((bucket) => {
    const { key, doc_count: errorCount } = bucket;
    const relativeRate = errorCount / transactionCountByTimestamp[key];
    return { x: key, y: relativeRate };
  });

  return {
    noHits: transactions?.totalHits === 0,
    errorRates,
  };
}
