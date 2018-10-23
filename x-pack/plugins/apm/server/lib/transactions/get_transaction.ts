/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams, SearchResponse } from 'elasticsearch';
import { oc } from 'ts-optchain';
import { Transaction } from 'x-pack/plugins/apm/typings/Transaction';
import {
  PROCESSOR_EVENT,
  TRACE_ID,
  TRANSACTION_ID
} from '../../../common/constants';
import { Setup } from '../helpers/setup_request';

interface HttpError extends Error {
  statusCode?: number;
}

export async function getTransaction(
  transactionId: string,
  traceId: string | undefined,
  setup: Setup
) {
  const { start, end, esFilterQuery, client, config } = setup;

  const params: SearchParams = {
    index: config.get('apm_oss.transactionIndices'),
    body: {
      size: 1,
      query: {
        bool: {
          filter: [
            { term: { [PROCESSOR_EVENT]: 'transaction' } },
            { term: { [TRANSACTION_ID]: transactionId } },
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

  if (esFilterQuery) {
    params.body.query.bool.filter.push(esFilterQuery);
  }

  if (traceId) {
    params.body.query.bool.filter.push({ term: { [TRACE_ID]: traceId } });
  }

  const resp: SearchResponse<Transaction> = await client('search', params);
  const result = oc(resp).hits.hits[0]._source();

  if (result === undefined) {
    const notFoundError = new Error(
      `No results found for transaction ID ${transactionId} and trace ID ${traceId}`
    ) as HttpError;
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  return result;
}
