/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  HTTP_RESPONSE_STATUS_CODE,
  PROCESSOR_EVENT,
  SERVICE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { rangeFilter } from '../../../common/utils/range_filter';
import { getMetricsDateHistogramParams } from '../helpers/metrics';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';

export async function getErrorRate({
  serviceName,
  setup,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  const { start, end, uiFiltersES, client, indices } = setup;

  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
    { range: rangeFilter(start, end) },
    ...uiFiltersES,
  ];

  const must = [{ exists: { field: HTTP_RESPONSE_STATUS_CODE } }];

  const dateHistogramAggs = {
    histogram: {
      date_histogram: getMetricsDateHistogramParams(start, end),
    },
  };

  const getTransactionsCount = async () => {
    const transactionsCountParams = {
      index: indices['apm_oss.transactionIndices'],
      body: {
        size: 0,
        query: { bool: { must, filter } },
        aggs: dateHistogramAggs,
      },
    };

    const resp = await client.search(transactionsCountParams);
    const transactionsCountByTimestamp: Record<number, number> = {};
    if (resp.aggregations) {
      resp.aggregations.histogram.buckets.forEach(
        (bucket) =>
          (transactionsCountByTimestamp[bucket.key] = bucket.doc_count)
      );
    }
    return {
      transactionsCountByTimestamp,
      noHits: resp.hits.total.value === 0,
    };
  };

  const getErroneousTransactionsCount = async () => {
    const erroneousTransactionsCountParams = {
      index: indices['apm_oss.transactionIndices'],
      body: {
        size: 0,
        query: {
          bool: {
            must,
            filter: [
              ...filter,
              {
                range: {
                  [HTTP_RESPONSE_STATUS_CODE]: {
                    gte: 400, // everything equals or above 400 should be treated as an error
                  },
                },
              },
            ],
          },
        },
        aggs: dateHistogramAggs,
      },
    };
    const resp = await client.search(erroneousTransactionsCountParams);

    return resp.aggregations?.histogram.buckets;
  };

  const [transactionsCount, erroneousTransactionsCount] = await Promise.all([
    getTransactionsCount(),
    getErroneousTransactionsCount(),
  ]);

  const { transactionsCountByTimestamp, noHits } = transactionsCount;

  const errorRates =
    erroneousTransactionsCount?.map(({ key, doc_count: errorCount }) => {
      const transactionsTotalCount = transactionsCountByTimestamp[key];
      return {
        x: key,
        y: errorCount / transactionsTotalCount,
      };
    }) || [];

  return { noHits, errorRates };
}
