/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_DURATION
} from '../../../../common/constants';

export async function calculateBucketSize({
  serviceName,
  transactionName,
  setup
}) {
  const { start, end, esFilterQuery, client, config } = setup;

  const params = {
    index: config.get('xpack.apm.indexPattern'),
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
          ]
        }
      },
      aggs: {
        stats: {
          extended_stats: {
            field: TRANSACTION_DURATION
          }
        }
      }
    }
  };

  if (esFilterQuery) {
    params.body.query.bool.filter.push(esFilterQuery);
  }

  const resp = await client('search', params);
  const minBucketSize = config.get('xpack.apm.minimumBucketSize');
  const bucketTargetCount = config.get('xpack.apm.bucketTargetCount');
  const { max } = resp.aggregations.stats;
  const bucketSize = Math.floor(max / bucketTargetCount);

  return bucketSize > minBucketSize ? bucketSize : minBucketSize;
}
