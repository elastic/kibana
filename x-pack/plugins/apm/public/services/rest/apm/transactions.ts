/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KFetchError } from 'ui/kfetch/kfetch_error';
import { TransactionWithErrorCountAPIResponse } from 'x-pack/plugins/apm/server/lib/transactions/get_transaction';
import { IUrlParams } from '../../../store/urlParams';
import { callApi } from '../callApi';
import { getEncodedEsQuery } from './apm';

export async function loadTransaction({
  serviceName,
  start,
  end,
  transactionId,
  traceId,
  kuery
}: IUrlParams) {
  try {
    const result = await callApi<TransactionWithErrorCountAPIResponse>({
      pathname: `/api/apm/services/${serviceName}/transactions/${transactionId}`,
      query: {
        traceId,
        start,
        end,
        esFilterQuery: await getEncodedEsQuery(kuery)
      }
    });
    return result;
  } catch (e) {
    const err: KFetchError = e;

    // swallow 404 errors
    if (err.res.status === 404) {
      return;
    }

    // re-throw all other errors
    throw err;
  }
}
