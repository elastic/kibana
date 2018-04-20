/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SERVICE_NAME, ERROR_GROUP_ID } from '../../../../common/constants';

export async function getBuckets({ serviceName, groupId, bucketSize, setup }) {
  const { start, end, client, config } = setup;

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
            { term: { [ERROR_GROUP_ID]: groupId } },
            { term: { [SERVICE_NAME]: serviceName } }
          ]
        }
      },
      aggs: {
        distribution: {
          histogram: {
            field: '@timestamp',
            min_doc_count: 0,
            interval: bucketSize,
            extended_bounds: {
              min: start,
              max: end
            }
          }
        }
      }
    }
  };

  const resp = await client('search', params);

  const buckets = resp.aggregations.distribution.buckets.map(bucket => ({
    key: bucket.key,
    count: bucket.doc_count
  }));

  return {
    total_hits: resp.hits.total,
    buckets
  };
}
