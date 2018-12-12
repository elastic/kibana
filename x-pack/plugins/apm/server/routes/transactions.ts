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
import { getTransaction } from '../lib/transactions/get_transaction';
import { getSpans } from '../lib/transactions/spans/get_spans';

const defaultErrorHandler = (err: Error) => {
  // tslint:disable-next-line
  console.error(err.stack);
  throw Boom.boomify(err, { statusCode: 400 });
};

export function initTransactionsApi(server: Server) {
  server.route({
    method: 'GET',
    path: `/api/apm/services/{serviceName}/transactions/{transactionId}`,
    options: {
      validate: {
        query: withDefaultValidators({
          traceId: Joi.string().allow('') // TODO: this should be a path param and made required by 7.0
        })
      }
    },
    handler: req => {
      const { transactionId } = req.params;
      const { traceId } = req.query as { traceId: string };
      const setup = setupRequest(req);
      return getTransaction(transactionId, traceId, setup).catch(
        defaultErrorHandler
      );
    }
  });

  // TODO: this can be removed by 7.0 when v1 compatability can be dropped
  server.route({
    method: 'GET',
    path: `/api/apm/services/{serviceName}/transactions/{transactionId}/spans`,
    options: {
      validate: {
        query: withDefaultValidators()
      }
    },
    handler: req => {
      const { transactionId } = req.params;
      const setup = setupRequest(req);
      return getSpans(transactionId, setup).catch(defaultErrorHandler);
    }
  });
}
