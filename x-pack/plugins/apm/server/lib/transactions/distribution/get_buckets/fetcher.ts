/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AggregationSearchResponse, SearchResponse } from 'elasticsearch';
import {
  SERVICE_NAME,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_SAMPLED,
  TRANSACTION_TYPE
} from 'x-pack/plugins/apm/common/constants';
import { Setup } from 'x-pack/plugins/apm/server/lib/helpers/setup_request';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';

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

export type ESResponse = AggregationSearchResponse<void, Aggs>;

export function bucketFetcher(
  serviceName: string,
  transactionName: string,
  transactionType: string,
  transactionId: string,
  bucketSize: number,
  setup: Setup
): Promise<ESResponse> {
  const { start, end, esFilterQuery, client, config } = setup;
  const bucketTargetCount = config.get<number>('xpack.apm.bucketTargetCount');
  const params = {
    index: config.get<string>('apm_oss.transactionIndices'),
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [TRANSACTION_TYPE]: transactionType } },
            { term: { [`${TRANSACTION_NAME}.keyword`]: transactionName } },
            {
              range: {
                '@timestamp': {
                  gte: start,
                  lte: end,
                  format: 'epoch_millis'
                }
              }
            }
          ],
          should: [
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

  if (esFilterQuery) {
    params.body.query.bool.filter.push(esFilterQuery);
  }

  return client<void, Aggs>('search', params);
}
