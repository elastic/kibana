/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Boom from 'boom';

import { getTimeseriesData } from '../lib/transactions/charts/get_timeseries_data';
import getSpans from '../lib/transactions/spans/get_spans';
import { getDistribution } from '../lib/transactions/distribution/get_distribution';
import { getTransactionDuration } from '../lib/transactions/get_transaction_duration';
import { getTopTransactions } from '../lib/transactions/get_top_transactions';
import getTransaction from '../lib/transactions/get_transaction';
import { setupRequest } from '../lib/helpers/setup_request';
import { dateValidation } from '../lib/helpers/date_validation';

const pre = [{ method: setupRequest, assign: 'setup' }];
const ROOT = '/api/apm/services/{serviceName}/transactions';
const defaultErrorHandler = reply => err => {
  console.error(err.stack);
  reply(Boom.wrap(err, 400));
};

export function initTransactionsApi(server) {
  server.route({
    method: 'GET',
    path: ROOT,
    config: {
      pre,
      validate: {
        query: Joi.object().keys({
          start: dateValidation,
          end: dateValidation,
          transaction_type: Joi.string().default('request'),
          query: Joi.string()
        })
      }
    },
    handler: (req, reply) => {
      const { serviceName } = req.params;
      const { transaction_type: transactionType } = req.query;
      const { setup } = req.pre;

      return getTopTransactions({
        serviceName,
        transactionType,
        setup
      })
        .then(reply)
        .catch(defaultErrorHandler(reply));
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/{transactionId}`,
    config: {
      pre,
      validate: {
        query: Joi.object().keys({
          start: dateValidation,
          end: dateValidation
        })
      }
    },
    handler: (req, reply) => {
      const { transactionId } = req.params;
      const { setup } = req.pre;
      return getTransaction({ transactionId, setup })
        .then(res => reply(res))
        .catch(defaultErrorHandler(reply));
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/{transactionId}/spans`,
    config: {
      pre,
      validate: {
        query: Joi.object().keys({
          start: dateValidation,
          end: dateValidation
        })
      }
    },
    handler: (req, reply) => {
      const { transactionId } = req.params;
      const { setup } = req.pre;
      return Promise.all([
        getSpans({ transactionId, setup }),
        getTransactionDuration({ transactionId, setup })
      ])
        .then(([spans, duration]) => reply({ ...spans, duration }))
        .catch(defaultErrorHandler(reply));
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/charts`,
    config: {
      pre,
      validate: {
        query: Joi.object().keys({
          start: dateValidation,
          end: dateValidation,
          transaction_type: Joi.string().default('request'),
          transaction_name: Joi.string(),
          query: Joi.string()
        })
      }
    },
    handler: (req, reply) => {
      const { setup } = req.pre;
      const { serviceName } = req.params;
      const transactionType = req.query.transaction_type;
      const transactionName = req.query.transaction_name;

      return getTimeseriesData({
        serviceName,
        transactionType,
        transactionName,
        setup
      })
        .then(reply)
        .catch(defaultErrorHandler(reply));
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/distribution`,
    config: {
      pre,
      validate: {
        query: Joi.object().keys({
          start: dateValidation,
          end: dateValidation,
          transaction_name: Joi.string().required()
        })
      }
    },
    handler: (req, reply) => {
      const { setup } = req.pre;
      const { serviceName } = req.params;
      const { transaction_name: transactionName } = req.query;
      return getDistribution({
        serviceName,
        transactionName,
        setup
      })
        .then(reply)
        .catch(defaultErrorHandler(reply));
    }
  });
}
