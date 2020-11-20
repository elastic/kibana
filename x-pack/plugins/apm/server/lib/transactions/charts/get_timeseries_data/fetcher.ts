/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from '../../../../../../../typings/elasticsearch';
import { PromiseReturnType } from '../../../../../../observability/typings/common';
import {
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_RESULT,
  TRANSACTION_TYPE,
} from '../../../../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../../../../common/utils/range_filter';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../../../helpers/aggregated_transactions';
import { getBucketSize } from '../../../helpers/get_bucket_size';
import { Setup, SetupTimeRange } from '../../../helpers/setup_request';

export type ESResponse = PromiseReturnType<typeof timeseriesFetcher>;
export function timeseriesFetcher({
  serviceName,
  transactionType,
  transactionName,
  setup,
  searchAggregatedTransactions,
}: {
  serviceName: string;
  transactionType: string | undefined;
  transactionName: string | undefined;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
}) {
  const { start, end, apmEventClient } = setup;
  const { intervalString } = getBucketSize({ start, end });

  const filter: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    { range: rangeFilter(start, end) },
    ...getDocumentTypeFilterForAggregatedTransactions(
      searchAggregatedTransactions
    ),
    ...setup.esFilter,
  ];

  if (transactionName) {
    filter.push({ term: { [TRANSACTION_NAME]: transactionName } });
  }

  // TODO reimplement these as uiFilters
  if (transactionType) {
    filter.push({ term: { [TRANSACTION_TYPE]: transactionType } });
  }

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
        response_times: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: intervalString,
            min_doc_count: 0,
            extended_bounds: { min: start, max: end },
          },
          aggs: {
            avg: {
              avg: {
                field: getTransactionDurationFieldForAggregatedTransactions(
                  searchAggregatedTransactions
                ),
              },
            },
            pct: {
              percentiles: {
                field: getTransactionDurationFieldForAggregatedTransactions(
                  searchAggregatedTransactions
                ),
                percents: [95, 99],
                hdr: { number_of_significant_value_digits: 2 },
              },
            },
          },
        },
        overall_avg_duration: {
          avg: {
            field: getTransactionDurationFieldForAggregatedTransactions(
              searchAggregatedTransactions
            ),
          },
        },
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
              aggs: {
                count: {
                  value_count: {
                    field: getTransactionDurationFieldForAggregatedTransactions(
                      searchAggregatedTransactions
                    ),
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  return apmEventClient.search(params);
}
