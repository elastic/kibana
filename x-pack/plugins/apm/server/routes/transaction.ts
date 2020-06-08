/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { setupRequest } from '../lib/helpers/setup_request';
import { getRootTransactionByTraceId } from '../lib/transactions/get_transaction_by_trace';
import { createRoute } from './create_route';

export const transactionByTraceIdRoute = createRoute(() => ({
  path: '/api/apm/transaction/{traceId}',
  params: {
    path: t.type({
      traceId: t.string,
    }),
  },
  handler: async ({ context, request }) => {
    const { traceId } = context.params.path;
    const setup = await setupRequest(context, request);
    return getRootTransactionByTraceId(traceId, setup);
  },
}));
