/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { Span } from 'x-pack/plugins/apm/typings/Span';
import {
  PROCESSOR_EVENT,
  SPAN_START,
  SPAN_TYPE,
  TRANSACTION_ID
} from '../../../../common/constants';
import { Setup } from '../../helpers/setup_request';

export async function getSpans(transactionId: string, setup: Setup) {
  const { start, end, client, config } = setup;

  const params = {
    index: config.get('apm_oss.spanIndices'),
    body: {
      size: 500,
      query: {
        bool: {
          filter: [
            { term: { [TRANSACTION_ID]: transactionId } },
            { term: { [PROCESSOR_EVENT]: 'span' } },
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
      sort: [{ [SPAN_START]: { order: 'asc' } }],
      aggs: {
        types: {
          terms: {
            field: SPAN_TYPE,
            size: 100
          }
        }
      }
    }
  };

  const resp: SearchResponse<Span> = await client('search', params);
  return resp.hits.hits.map(hit => hit._source);
}
