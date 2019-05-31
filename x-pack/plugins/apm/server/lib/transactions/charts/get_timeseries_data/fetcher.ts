/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter, SearchParams } from 'elasticsearch';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  TRANSACTION_RESULT,
  TRANSACTION_TYPE
} from '../../../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../../../typings/common';
import { getBucketSize } from '../../../helpers/get_bucket_size';
import { rangeFilter } from '../../../helpers/range_filter';
import { Setup } from '../../../helpers/setup_request';

interface ResponseTimeBucket {
  key_as_string: string;
  key: number;
  doc_count: number;
  avg: {
    value: number | null;
  };
  pct: {
    values: {
      '95.0': number | 'NaN';
      '99.0': number | 'NaN';
    };
  };
}

interface TransactionResultBucket {
  /**
   * transaction result eg. 2xx
   */
  key: string;
  doc_count: number;
  timeseries: {
    buckets: Array<{
      key_as_string: string;
      /**
       * timestamp in ms
       */
      key: number;
      doc_count: number;
    }>;
  };
}

interface Aggs {
  response_times: {
    buckets: ResponseTimeBucket[];
  };
  transaction_results: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: TransactionResultBucket[];
  };
  overall_avg_duration: {
    value: number;
  };
}

export type ESResponse = PromiseReturnType<typeof timeseriesFetcher>;
export function timeseriesFetcher({
  serviceName,
  transactionType,
  transactionName,
  setup
}: {
  serviceName: string;
  transactionType?: string;
  transactionName?: string;
  setup: Setup;
}) {
  const { start, end, uiFiltersES, client, config } = setup;
  const { intervalString } = getBucketSize(start, end, 'auto');

  const filter: ESFilter[] = [
    { term: { [PROCESSOR_EVENT]: 'transaction' } },
    { term: { [SERVICE_NAME]: serviceName } },
    { range: rangeFilter(start, end) },
    ...uiFiltersES
  ];

  if (transactionName) {
    filter.push({ term: { [TRANSACTION_NAME]: transactionName } });
  }

  // TODO reimplement these as uiFilters
  if (transactionType) {
    filter.push({ term: { [TRANSACTION_TYPE]: transactionType } });
  }

  const params: SearchParams = {
    index: config.get('apm_oss.transactionIndices'),
    body: {
      size: 0,
      query: { bool: { filter } },
      aggs: {
        response_times: {
          date_histogram: {
            field: '@timestamp',
            interval: intervalString,
            min_doc_count: 0,
            extended_bounds: { min: start, max: end }
          },
          aggs: {
            avg: { avg: { field: TRANSACTION_DURATION } },
            pct: {
              percentiles: { field: TRANSACTION_DURATION, percents: [95, 99] }
            }
          }
        },
        overall_avg_duration: { avg: { field: TRANSACTION_DURATION } },
        transaction_results: {
          terms: { field: TRANSACTION_RESULT, missing: '' },
          aggs: {
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                interval: intervalString,
                min_doc_count: 0,
                extended_bounds: { min: start, max: end }
              }
            }
          }
        }
      }
    }
  };

  return client.search<void, Aggs>(params);
}
