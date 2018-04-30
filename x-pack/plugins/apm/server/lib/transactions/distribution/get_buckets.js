/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import {
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_SAMPLED
} from '../../../../common/constants';

export async function getBuckets({
  serviceName,
  transactionName,
  bucketSize = 100,
  setup
}) {
  const { start, end, client, config } = setup;

  const bucketTargetCount = config.get('xpack.apm.bucketTargetCount');

  const params = {
    index: config.get('xpack.apm.indexPattern'),
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: start,
                  lte: end,
                  format: 'epoch_millis'
                }
              }
            },
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [`${TRANSACTION_NAME}.keyword`]: transactionName } }
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
            transaction: {
              top_hits: {
                _source: [TRANSACTION_ID, TRANSACTION_SAMPLED],
                size: 1
              }
            }
          }
        }
      }
    }
  };

  const resp = await client('search', params);

  const buckets = resp.aggregations.distribution.buckets.map(bucket => {
    const transaction = get(bucket.transaction.hits.hits[0], '_source');
    return {
      key: bucket.key,
      count: bucket.doc_count,
      transaction_id: get(transaction, TRANSACTION_ID),
      sampled: get(transaction, TRANSACTION_SAMPLED)
    };
  });

  return {
    total_hits: resp.hits.total,
    buckets
  };
}
