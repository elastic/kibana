/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams } from 'elasticsearch';
import { TRACE_ID } from '../../../common/elasticsearch_fieldnames';
import { Span } from '../../../typings/es_schemas/Span';
import { Transaction } from '../../../typings/es_schemas/Transaction';
import { Setup } from '../helpers/setup_request';

export type TraceAPIResponse = Array<Transaction | Span>;

export async function getTrace(
  traceId: string,
  setup: Setup
): Promise<TraceAPIResponse> {
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
      }
    }
  };

  const resp = await client<Span | Transaction>('search', params);
  return resp.hits.hits.map(hit => hit._source);
}
