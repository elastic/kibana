/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from '../../../../typings/elasticsearch';
import { PromiseReturnType } from '../../../../../observability/typings/common';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
  USER_AGENT_NAME,
  TRANSACTION_DURATION,
} from '../../../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../../../common/utils/range_filter';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { Options } from '.';
import { TRANSACTION_PAGE_LOAD } from '../../../../common/transaction_types';
import { ProcessorEvent } from '../../../../common/processor_event';

export type ESResponse = PromiseReturnType<typeof fetcher>;

export function fetcher(options: Options) {
  const { end, client, indices, start, uiFiltersES } = options.setup;
  const { serviceName } = options;
  const { intervalString } = getBucketSize(start, end, 'auto');

  const filter: ESFilter[] = [
    { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [TRANSACTION_TYPE]: TRANSACTION_PAGE_LOAD } },
    { range: rangeFilter(start, end) },
    ...uiFiltersES,
  ];

  const params = {
    index: indices['apm_oss.transactionIndices'],
    body: {
      size: 0,
      query: { bool: { filter } },
      aggs: {
        user_agent_keys: {
          terms: {
            field: USER_AGENT_NAME,
          },
        },
        browsers: {
          date_histogram: {
            extended_bounds: {
              max: end,
              min: start,
            },
            field: '@timestamp',
            fixed_interval: intervalString,
            min_doc_count: 0,
          },
          aggs: {
            user_agent: {
              terms: {
                field: USER_AGENT_NAME,
              },
              aggs: {
                avg_duration: {
                  avg: {
                    field: TRANSACTION_DURATION,
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  return client.search(params);
}
