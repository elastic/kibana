/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Server } from 'hapi';
import Joi from 'joi';
import { withDefaultValidators } from '../lib/helpers/input_validation';
import { setupRequest } from '../lib/helpers/setup_request';
import { getTransactionWithErrorCount } from '../lib/transactions/get_transaction';

export function initTransactionsApi(server: Server) {
  server.route({
    method: 'GET',
    path: `/api/apm/services/{serviceName}/transactions/{transactionId}`,
    options: {
      validate: {
        query: withDefaultValidators({
          traceId: Joi.string().required()
        })
      }
    },
    handler: async req => {
      const { transactionId } = req.params;
      const { traceId } = req.query as { traceId: string };
      const setup = setupRequest(req);
      const transactionWithErrorCount = await getTransactionWithErrorCount(
        transactionId,
        traceId,
        setup
      );
      if (transactionWithErrorCount.transaction) {
        return transactionWithErrorCount;
      } else {
        throw Boom.notFound('Cannot find the requested page');
      }
    }
  });
}
