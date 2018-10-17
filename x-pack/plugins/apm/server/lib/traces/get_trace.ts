/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams, SearchResponse } from 'elasticsearch';
import { WaterfallResponse } from 'x-pack/plugins/apm/typings/waterfall';
import { SERVICE_NAME, TRACE_ID } from '../../../common/constants';
import { TermsAggsBucket } from '../../../typings/elasticsearch';
import { Span } from '../../../typings/Span';
import { Transaction } from '../../../typings/Transaction';
import { Setup } from '../helpers/setup_request';

export async function getTrace(
  traceId: string,
  setup: Setup
): Promise<WaterfallResponse> {
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

  const resp: SearchResponse<Span | Transaction> = await client(
    'search',
    params
  );

  return {
    services: (resp.aggregations.services.buckets as TermsAggsBucket[]).map(
      bucket => bucket.key
    ),
    hits: resp.hits.hits.map(hit => hit._source)
  };
}
