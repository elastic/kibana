/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { idx } from 'x-pack/plugins/apm/common/idx';
import { Setup } from '../../../helpers/setup_request';

interface IOptions {
  serviceName: string;
  transactionType: string;
  setup: Setup;
}

interface ESResponse {
  bucket_span: number;
}

export async function getMlBucketSize({
  serviceName,
  transactionType,
  setup
}: IOptions): Promise<number> {
  const { client, start, end } = setup;
  const params = {
    index: `.ml-anomalies-${serviceName}-${transactionType}-high_mean_response_time`.toLowerCase(),
    body: {
      _source: 'bucket_span',
      size: 1,
      query: {
        bool: {
          must: {
            exists: {
              field: 'bucket_span'
            }
          },
          filter: [
            {
              range: {
                timestamp: {
                  gte: start,
                  lte: end,
                  format: 'epoch_millis'
                }
              }
            }
          ]
        }
      }
    }
  };

  try {
    const resp = await client<ESResponse>('search', params);
    return idx(resp, _ => _.hits.hits[0]._source.bucket_span) || 0;
  } catch (err) {
    const isHttpError = 'statusCode' in err;
    if (isHttpError) {
      return 0;
    }
    throw err;
  }
}
