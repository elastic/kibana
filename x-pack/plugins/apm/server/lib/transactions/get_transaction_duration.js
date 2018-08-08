/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import {
  TRANSACTION_ID,
  TRANSACTION_DURATION,
  PROCESSOR_EVENT
} from '../../../common/constants';

export async function getTransactionDuration({ transactionId, setup }) {
  const { start, end, esFilterQuery, client, config } = setup;

  const params = {
    index: config.get('apm_oss.transactionIndices'),
    body: {
      size: 1,
      _source: TRANSACTION_DURATION,
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

  const resp = await client('search', params);
  return get(resp, `hits.hits[0]._source.${TRANSACTION_DURATION}`);
}
