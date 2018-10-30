/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams, SearchResponse } from 'elasticsearch';
import { oc } from 'ts-optchain';
import {
  SERVICE_NAME,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_SAMPLED
} from '../../../../common/constants';
import { TermsAggsBucket } from '../../../../typings/elasticsearch';
import { Transaction } from '../../../../typings/Transaction';
import { Setup } from '../../helpers/setup_request';

export interface IBucket {
  key: string;
  count: number;
  sample?: IBucketSample;
}

interface IBucketSample {
  traceId?: string;
  transactionId?: string;
}

interface IBucketsResponse {
  totalHits: number;
  buckets: IBucket[];
}

interface ESBucket extends TermsAggsBucket {
  sample: SearchResponse<{
    transaction: Pick<Transaction['transaction'], 'id' | 'sampled'>;
    trace: {
      id: string;
    };
  }>;
}

export async function getBuckets(
  serviceName: string,
  transactionName: string,
  bucketSize: number,
  setup: Setup
): Promise<IBucketsResponse> {
  const { start, end, esFilterQuery, client, config } = setup;
  const bucketTargetCount: number = config.get('xpack.apm.bucketTargetCount');
  const params: SearchParams = {
    index: config.get('apm_oss.transactionIndices'),
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
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
          should: [{ term: { [TRANSACTION_SAMPLED]: true } }]
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

  const resp = await client('search', params);
  const buckets = (resp.aggregations.distribution.buckets as ESBucket[]).map(
    bucket => {
      const sampleSource = oc(bucket).sample.hits.hits[0]._source();
      const isSampled = oc(sampleSource).transaction.sampled(false);
      const sample = {
        traceId: oc(sampleSource).trace.id(),
        transactionId: oc(sampleSource).transaction.id()
      };

      return {
        key: bucket.key,
        count: bucket.doc_count,
        sample: isSampled ? sample : undefined
      };
    }
  );

  return {
    totalHits: resp.hits.total,
    buckets
  };
}
