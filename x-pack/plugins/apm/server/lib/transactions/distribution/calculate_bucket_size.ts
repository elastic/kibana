/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams } from 'elasticsearch';
import {
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  TRANSACTION_TYPE
} from '../../../../common/elasticsearch_fieldnames';
import { Setup } from '../../helpers/setup_request';

export async function calculateBucketSize(
  serviceName: string,
  transactionName: string,
  transactionType: string,
  setup: Setup
) {
  const { start, end, esFilterQuery, client, config } = setup;

  const params: SearchParams = {
    index: config.get('apm_oss.transactionIndices'),
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [TRANSACTION_TYPE]: transactionType } },
            { term: { [TRANSACTION_NAME]: transactionName } },
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

  interface Aggs {
    stats: {
      max: number;
    };
  }

  const resp = await client<void, Aggs>('search', params);
  const minBucketSize: number = config.get('xpack.apm.minimumBucketSize');
  const bucketTargetCount: number = config.get('xpack.apm.bucketTargetCount');
  const max = resp.aggregations.stats.max;
  const bucketSize = Math.floor(max / bucketTargetCount);
  return bucketSize > minBucketSize ? bucketSize : minBucketSize;
}
