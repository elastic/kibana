/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ProcessorEvent } from '../../../common/processor_event';
import {
  ERROR_GROUP_ID,
  SERVICE_NAME,
  PROCESSOR_EVENT,
} from '../../../common/elasticsearch_fieldnames';
import { getBucketSize } from '../helpers/get_bucket_size';
import { rangeFilter } from '../helpers/range_filter';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';

export async function getErrorRate({
  serviceName,
  groupId,
  setup,
}: {
  serviceName: string;
  groupId?: string;
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  const { start, end, uiFiltersES, client, indices } = setup;
  const { intervalString } = getBucketSize(start, end, 'auto');
  const groupIdTerm = groupId ? [{ term: { [ERROR_GROUP_ID]: groupId } }] : [];

  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    { range: rangeFilter(start, end) },
    ...uiFiltersES,
  ];

  const aggs = {
    response_times: {
      date_histogram: {
        field: '@timestamp',
        fixed_interval: intervalString,
        min_doc_count: 0,
        extended_bounds: { min: start, max: end },
      },
    },
  };

  const getTransactionBucketAggregation = async () => {
    const resp = await client.search({
      index: indices['apm_oss.transactionIndices'],
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...filter,
              { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
            ],
          },
        },
        aggs,
      },
    });
    return {
      totalHits: resp.hits.total.value,
      aggs: resp.aggregations?.response_times.buckets,
    };
  };
  const getErrorBucketAggregation = async () => {
    const resp = await client.search({
      index: indices['apm_oss.errorIndices'],
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...filter,
              ...groupIdTerm,
              { term: { [PROCESSOR_EVENT]: ProcessorEvent.error } },
            ],
          },
        },
        aggs,
      },
    });
    return resp.aggregations?.response_times.buckets;
  };

  // Needed to the wrap the call to client.search in a function to avoid "Type instantiation is excessively deep and possibly infinite"
  const [transactions, errors] = await Promise.all([
    getTransactionBucketAggregation(),
    getErrorBucketAggregation(),
  ]);

  const transactionByTimestamp: Record<number, number> = {};
  if (transactions?.aggs) {
    transactions.aggs.forEach((bucket) => {
      transactionByTimestamp[bucket.key] = bucket.doc_count;
    });
  }

  return errors?.map((bucket) => {
    const { key, doc_count: errorCount } = bucket;
    return {
      x: key,
      y:
        // If the transaction count doesn't have any hits, it means that the there's no result
        transactions?.totalHits === 0
          ? undefined
          : errorCount / (transactionByTimestamp[key] || 1),
    };
  });
}
