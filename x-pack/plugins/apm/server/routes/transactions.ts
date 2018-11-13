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
// @ts-ignore
import { getTimeseriesData } from '../lib/transactions/charts/get_timeseries_data';
import { getDistribution } from '../lib/transactions/distribution/get_distribution';
import { getTopTransactions } from '../lib/transactions/get_top_transactions';
import { getTransaction } from '../lib/transactions/get_transaction';
import { getSpans } from '../lib/transactions/spans/get_spans';

const pre = [{ method: setupRequest, assign: 'setup' }];
const ROOT = '/api/apm/services/{serviceName}/transactions';
const defaultErrorHandler = (err: Error) => {
  // tslint:disable-next-line
  console.error(err.stack);
  // @ts-ignore
  Boom.boomify(err, { statusCode: err.statusCode || 400 });
};

export function initTransactionsApi(server: Server) {
  server.route({
    method: 'GET',
    path: ROOT,
    options: {
      pre,
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
      const { setup } = req.pre;

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
      pre,
      validate: {
        query: withDefaultValidators({
          traceId: Joi.string().allow('')
        })
      }
    },
    handler: req => {
      const { transactionId } = req.params;
      const { traceId } = req.query as { traceId: string };
      const { setup } = req.pre;
      return getTransaction(transactionId, traceId, setup).catch(
        defaultErrorHandler
      );
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/{transactionId}/spans`,
    options: {
      pre,
      validate: {
        query: withDefaultValidators()
      }
    },
    handler: req => {
      const { transactionId } = req.params;
      const { setup } = req.pre;
      return getSpans(transactionId, setup).catch(defaultErrorHandler);
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/charts`,
    options: {
      pre,
      validate: {
        query: withDefaultValidators({
          transaction_type: Joi.string().default('request'),
          transaction_name: Joi.string(),
          query: Joi.string()
        })
      }
    },
    handler: req => {
      const { setup } = req.pre;
      const { serviceName } = req.params;
      const { transaction_type: transactionType } = req.query as {
        transaction_type: string;
      };
      const { transaction_name: transactionName } = req.query as {
        transaction_name: string;
      };

      return getTimeseriesData({
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
      pre,
      validate: {
        query: withDefaultValidators({
          transaction_name: Joi.string().required()
        })
      }
    },
    handler: req => {
      const { setup } = req.pre;
      const { serviceName } = req.params;
      const { transaction_name: transactionName } = req.query as {
        transaction_name: string;
      };
      return getDistribution(serviceName, transactionName, setup).catch(
        defaultErrorHandler
      );
    }
  });
}
