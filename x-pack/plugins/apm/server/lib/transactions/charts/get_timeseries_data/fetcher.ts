/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from '../../../../../typings/elasticsearch';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  TRANSACTION_RESULT,
  TRANSACTION_TYPE,
} from '../../../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../../../../observability/typings/common';
import { getBucketSize } from '../../../helpers/get_bucket_size';
import { rangeFilter } from '../../../../../common/utils/range_filter';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../../../helpers/setup_request';

export type ESResponse = PromiseReturnType<typeof timeseriesFetcher>;
export function timeseriesFetcher({
  serviceName,
  transactionType,
  transactionName,
  setup,
}: {
  serviceName: string;
  transactionType: string | undefined;
  transactionName: string | undefined;
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  const { start, end, uiFiltersES, client, indices } = setup;
  const { intervalString } = getBucketSize(start, end, 'auto');

  const filter: ESFilter[] = [
    { term: { [PROCESSOR_EVENT]: 'transaction' } },
    { term: { [SERVICE_NAME]: serviceName } },
    { range: rangeFilter(start, end) },
    ...uiFiltersES,
  ];

  if (transactionName) {
    filter.push({ term: { [TRANSACTION_NAME]: transactionName } });
  }

  // TODO reimplement these as uiFilters
  if (transactionType) {
    filter.push({ term: { [TRANSACTION_TYPE]: transactionType } });
  }

  const params = {
    index: indices['apm_oss.transactionIndices'],
    body: {
      size: 0,
      query: { bool: { filter } },
      aggs: {
        response_times: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: intervalString,
            min_doc_count: 0,
            extended_bounds: { min: start, max: end },
          },
          aggs: {
            avg: { avg: { field: TRANSACTION_DURATION } },
            pct: {
              percentiles: {
                field: TRANSACTION_DURATION,
                percents: [95, 99],
                hdr: { number_of_significant_value_digits: 2 },
              },
            },
          },
        },
        overall_avg_duration: { avg: { field: TRANSACTION_DURATION } },
        transaction_results: {
          terms: { field: TRANSACTION_RESULT, missing: '' },
          aggs: {
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: intervalString,
                min_doc_count: 0,
                extended_bounds: { min: start, max: end },
              },
            },
          },
        },
      },
    },
  };

  return client.search(params);
}
