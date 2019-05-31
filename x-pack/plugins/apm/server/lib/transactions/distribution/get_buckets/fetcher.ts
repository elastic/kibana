/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_SAMPLED,
  TRANSACTION_TYPE
} from '../../../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../../../typings/common';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';
import { rangeFilter } from '../../../helpers/range_filter';
import { Setup } from '../../../helpers/setup_request';

interface Bucket {
  key: number;
  doc_count: number;
  sample: SearchResponse<{
    transaction: Pick<Transaction['transaction'], 'id' | 'sampled'>;
    trace: {
      id: string;
    };
  }>;
}

interface Aggs {
  distribution: {
    buckets: Bucket[];
  };
}

export type ESResponse = PromiseReturnType<typeof bucketFetcher>;
export function bucketFetcher(
  serviceName: string,
  transactionName: string,
  transactionType: string,
  transactionId: string,
  traceId: string,
  bucketSize: number,
  setup: Setup
) {
  const { start, end, uiFiltersES, client, config } = setup;
  const bucketTargetCount = config.get<number>('xpack.apm.bucketTargetCount');

  const params = {
    index: config.get<string>('apm_oss.transactionIndices'),
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [PROCESSOR_EVENT]: 'transaction' } },
            { term: { [TRANSACTION_TYPE]: transactionType } },
            { term: { [TRANSACTION_NAME]: transactionName } },
            { range: rangeFilter(start, end) },
            ...uiFiltersES
          ],
          should: [
            { term: { [TRACE_ID]: traceId } },
            { term: { [TRANSACTION_ID]: transactionId } },
            { term: { [TRANSACTION_SAMPLED]: true } }
          ]
        }
      },
      aggs: {
        distribution: {
          histogram: {
            field: TRANSACTION_DURATION,
            interval: bucketSize,
            min_doc_count: 0,
            extended_bounds: {
              min: 0,
              max: bucketSize * bucketTargetCount
            }
          },
          aggs: {
            sample: {
              top_hits: {
                _source: [TRANSACTION_ID, TRANSACTION_SAMPLED, TRACE_ID],
                size: 1
              }
            }
          }
        }
      }
    }
  };

  return client.search<void, Aggs>(params);
}
