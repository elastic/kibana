/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/

import { TRACE_ID } from '../../../common/constants';

export async function getTrace({ traceId, setup }) {
  const { start, end, client, config } = setup;

  const params = {
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
            field: 'context.service.name',
            size: 500
          }
        }
      }
    }
  };

  const resp = await client('search', params);

  return {
    services: resp.aggregations.services.buckets.map(bucket => bucket.key),
    hits: resp.hits.hits.map(hit => hit._source)
  };
}
