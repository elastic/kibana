/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  HTTP_RESPONSE_STATUS_CODE,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { getMetricsDateHistogramParams } from '../helpers/metrics';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';
import { rangeFilter } from '../../../common/utils/range_filter';

// Regex for 5xx and 4xx
const errorStatusCodeRegex = /5\d{2}|4\d{2}/;

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

  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
    { range: rangeFilter(start, end) },
    ...uiFiltersES,
  ];

  const params = {
    index: indices['apm_oss.transactionIndices'],
    body: {
      size: 0,
      query: {
        bool: { filter },
      },
      aggs: {
        histogram: {
          date_histogram: getMetricsDateHistogramParams(start, end),
          aggs: {
            statusAggregation: {
              terms: {
                field: HTTP_RESPONSE_STATUS_CODE,
                size: 10,
              },
            },
          },
        },
      },
    },
  };
  const resp = await client.search(params);
  const noHits = resp.hits.total.value === 0;

  const errorRates = resp.aggregations?.histogram.buckets.map((bucket) => {
    let errorCount = 0;
    let total = 0;
    bucket.statusAggregation.buckets.forEach(({ key, doc_count: count }) => {
      if (errorStatusCodeRegex.test(key.toString())) {
        errorCount += count;
      }
      total += count;
    });
    return {
      x: bucket.key,
      y: noHits ? null : errorCount / total,
    };
  });
  return { noHits, errorRates };
}
