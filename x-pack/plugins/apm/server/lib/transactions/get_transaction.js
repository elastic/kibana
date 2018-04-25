/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TRANSACTION_ID, PROCESSOR_EVENT } from '../../../common/constants';
import { get } from 'lodash';

async function getTransaction({ transactionId, setup }) {
  const { start, end, client, config } = setup;

  const params = {
    index: config.get('xpack.apm.indexPattern'),
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
  const resp = await client('search', params);
  return get(resp, 'hits.hits[0]._source', {});
}

export default getTransaction;
