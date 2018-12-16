/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Span } from 'x-pack/plugins/apm/typings/es_schemas/Span';
import {
  PROCESSOR_EVENT,
  SPAN_START,
  TRANSACTION_ID
} from '../../../../common/constants';
import { Setup } from '../../helpers/setup_request';

export type SpanListAPIResponse = Span[];

export async function getSpans(
  transactionId: string,
  setup: Setup
): Promise<SpanListAPIResponse> {
  const { start, end, client, config } = setup;

  const params = {
    index: config.get<string>('apm_oss.spanIndices'),
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
      sort: [{ [SPAN_START]: { order: 'asc' } }]
    }
  };

  const resp = await client<Span>('search', params);
  return resp.hits.hits.map(hit => hit._source);
}
