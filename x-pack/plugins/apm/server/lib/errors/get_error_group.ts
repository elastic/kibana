/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from 'elasticsearch';
import { get } from 'lodash';
import { oc } from 'ts-optchain';
import { APMError } from 'x-pack/plugins/apm/typings/es_schemas/Error';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';
import {
  ERROR_GROUP_ID,
  SERVICE_NAME,
  TRANSACTION_SAMPLED
} from '../../../common/constants';
import { Setup } from '../helpers/setup_request';
import { getTransaction } from '../transactions/get_transaction';

export interface ErrorGroupAPIResponse {
  transaction?: Transaction;
  error?: APMError;
  occurrencesCount: number;
}

// TODO: rename from "getErrorGroup"  to "getErrorGroupSample" (since a single error is returned, not an errorGroup)
export async function getErrorGroup({
  serviceName,
  groupId,
  setup
}: {
  serviceName: string;
  groupId: string;
  setup: Setup;
}): Promise<ErrorGroupAPIResponse> {
  const { start, end, esFilterQuery, client, config } = setup;
  const filter: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [ERROR_GROUP_ID]: groupId } },
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
      size: 1,
      query: {
        bool: {
          filter,
          should: [{ term: { [TRANSACTION_SAMPLED]: true } }]
        }
      },
      sort: [
        { _score: 'desc' }, // sort by _score first to ensure that errors with transaction.sampled:true ends up on top
        { '@timestamp': { order: 'desc' } } // sort by timestamp to get the most recent error
      ]
    }
  };

  const resp = await client<APMError>('search', params);
  const error = oc(resp).hits.hits[0]._source();
  const transactionId = oc(error).transaction.id();
  const traceId: string | undefined = get(error, 'trace.id'); // cannot use oc because 'trace' doesn't exist on v1 errors

  let transaction;
  if (transactionId) {
    transaction = await getTransaction(transactionId, traceId, setup);
  }

  return {
    transaction,
    error,
    occurrencesCount: resp.hits.total
  };
}
