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
import { getChartsData } from '../lib/transactions/charts';
import { getDistribution } from '../lib/transactions/distribution';
import { getTopTransactions } from '../lib/transactions/get_top_transactions';
import { getTransaction } from '../lib/transactions/get_transaction';
import { getSpans } from '../lib/transactions/spans/get_spans';

const ROOT = '/api/apm/services/{serviceName}/transactions';
const defaultErrorHandler = (err: Error) => {
  // tslint:disable-next-line
  console.error(err.stack);
  throw Boom.boomify(err, { statusCode: 400 });
};

export function initTransactionsApi(server: Server) {
  server.route({
    method: 'GET',
    path: ROOT,
    options: {
      validate: {
        query: withDefaultValidators({
          transaction_type: Joi.string().default('request'),
          query: Joi.string()
        })
      }
    },
    handler: req => {
      const { serviceName } = req.params;
      const { transaction_type: transactionType } = req.query as {
        transaction_type: string;
      };
      const setup = setupRequest(req);

      return getTopTransactions({
        serviceName,
        transactionType,
        setup
      }).catch(defaultErrorHandler);
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/{transactionId}`,
    options: {
      validate: {
        query: withDefaultValidators({
          traceId: Joi.string().allow('')
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

  server.route({
    method: 'GET',
    path: `${ROOT}/{transactionId}/spans`,
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

  server.route({
    method: 'GET',
    path: `${ROOT}/charts`,
    options: {
      validate: {
        query: withDefaultValidators({
          transaction_type: Joi.string().default('request'),
          transaction_name: Joi.string(),
          query: Joi.string()
        })
      }
    },
    handler: req => {
      const setup = setupRequest(req);
      const { serviceName } = req.params;
      const { transaction_type: transactionType } = req.query as {
        transaction_type: string;
      };
      const { transaction_name: transactionName } = req.query as {
        transaction_name: string;
      };

      return getChartsData({
        serviceName,
        transactionType,
        transactionName,
        setup
      }).catch(defaultErrorHandler);
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/distribution`,
    options: {
      validate: {
        query: withDefaultValidators({
          transaction_name: Joi.string().required(),
          transaction_id: Joi.string().default('')
        })
      }
    },
    handler: req => {
      const setup = setupRequest(req);
      const { serviceName } = req.params;
      const {
        transaction_name: transactionName,
        transaction_id: transactionId
      } = req.query as {
        transaction_name: string;
        transaction_id: string;
      };
      return getDistribution(
        serviceName,
        transactionName,
        transactionId,
        setup
      ).catch(defaultErrorHandler);
    }
  });
}
