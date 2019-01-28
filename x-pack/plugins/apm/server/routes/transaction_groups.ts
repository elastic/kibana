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

const defaultErrorHandler = (err: Error) => {
  // tslint:disable-next-line
  console.error(err.stack);
  throw Boom.boomify(err, { statusCode: 400 });
};

export function initTransactionGroupsApi(server: Server) {
  server.route({
    method: 'GET',
    path:
      '/api/apm/services/{serviceName}/transaction_groups/{transactionType}',
    options: {
      validate: {
        query: withDefaultValidators({
          query: Joi.string()
        })
      }
    },
    handler: req => {
      const { serviceName, transactionType } = req.params;
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
    path: `/api/apm/services/{serviceName}/transaction_groups/{transactionType}/charts`,
    options: {
      validate: {
        query: withDefaultValidators()
      }
    },
    handler: req => {
      const setup = setupRequest(req);
      const { serviceName, transactionType } = req.params;

      return getChartsData({
        serviceName,
        transactionType,
        setup
      }).catch(defaultErrorHandler);
    }
  });

  server.route({
    method: 'GET',
    path: `/api/apm/services/{serviceName}/transaction_groups/charts`,
    options: {
      validate: {
        query: withDefaultValidators()
      }
    },
    handler: req => {
      const setup = setupRequest(req);
      const { serviceName } = req.params;

      return getChartsData({
        serviceName,
        setup
      }).catch(defaultErrorHandler);
    }
  });

  server.route({
    method: 'GET',
    path: `/api/apm/services/{serviceName}/transaction_groups/{transactionType}/{transactionName}/charts`,
    options: {
      validate: {
        query: withDefaultValidators()
      }
    },
    handler: req => {
      const setup = setupRequest(req);
      const { serviceName, transactionType, transactionName } = req.params;

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
    path: `/api/apm/services/{serviceName}/transaction_groups/{transactionType}/{transactionName}/distribution`,
    options: {
      validate: {
        query: withDefaultValidators({
          transactionId: Joi.string().default(''),
          traceId: Joi.string().default('')
        })
      }
    },
    handler: req => {
      const setup = setupRequest(req);
      const { serviceName, transactionType, transactionName } = req.params;
      const { transactionId, traceId } = req.query as {
        transactionId: string;
        traceId: string;
      };
      return getDistribution(
        serviceName,
        transactionName,
        transactionType,
        transactionId,
        traceId,
        setup
      ).catch(defaultErrorHandler);
    }
  });
}
