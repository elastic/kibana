/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from 'elasticsearch';
import { idx } from 'x-pack/plugins/apm/common/idx';
import { APMError } from 'x-pack/plugins/apm/typings/es_schemas/Error';
import {
  PROCESSOR_EVENT,
  TRACE_ID,
  TRANSACTION_ID
} from '../../../common/constants';
import { Setup } from '../helpers/setup_request';

export async function getErrorCount(
  transactionId: string,
  traceId: string,
  setup: Setup
): Promise<number> {
  const { start, end, esFilterQuery, client, config } = setup;
  const filter: ESFilter[] = [
    { term: { [TRANSACTION_ID]: transactionId } },
    { term: { [TRACE_ID]: traceId } },
    { term: { [PROCESSOR_EVENT]: 'error' } },
    {
      range: {
        '@timestamp': {
          gte: start,
          lte: end,
          format: 'epoch_millis'
        }
      }
    }
  ];

  if (esFilterQuery) {
    filter.push(esFilterQuery);
  }

  const params = {
    index: config.get<string>('apm_oss.errorIndices'),
    body: {
      size: 0,
      query: {
        bool: { filter }
      }
    }
  };
  const resp = await client<APMError>('search', params);
  return idx(resp, _ => _.hits.total) || 0;
}
