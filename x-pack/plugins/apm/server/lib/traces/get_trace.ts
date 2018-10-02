/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams, SearchResponse } from 'elasticsearch';
import { SERVICE_NAME, TRACE_ID } from '../../../common/constants';
import { Span } from '../../../typings/Span';
import { Transaction } from '../../../typings/Transaction';

interface ServerConfig {
  get: (key: string) => string;
}

// TODO: move to shared
interface Setup<T = any> {
  start: string;
  end: string;
  client: (type: string, params: object) => Promise<SearchResponse<T>>;
  config: ServerConfig;
}

export async function getTrace(traceId: string, setup: Setup) {
  const { start, end, client, config } = setup;

  const params: SearchParams = {
    index: config.get('apm_oss.transactionIndices'),
    body: {
      size: 1000,
      query: {
        bool: {
          filter: [
            { term: { [TRACE_ID]: traceId } },
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
        services: {
          terms: {
            field: SERVICE_NAME,
            size: 500
          }
        }
      }
    }
  };

  interface ServiceBucket {
    key: string;
  }

  const resp: SearchResponse<Span | Transaction> = await client(
    'search',
    params
  );

  return {
    services: resp.aggregations.services.buckets.map(
      (bucket: ServiceBucket) => bucket.key
    ),
    hits: resp.hits.hits.map(hit => hit._source)
  };
}
