/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import Joi from 'joi';
import { InternalCoreSetup } from 'src/core/server';
import { withDefaultValidators } from '../lib/helpers/input_validation';
import { setupRequest } from '../lib/helpers/setup_request';
import { getTransactionCharts } from '../lib/transactions/charts';
import { getTransactionDistribution } from '../lib/transactions/distribution';
import { getTopTransactions } from '../lib/transactions/get_top_transactions';

const defaultErrorHandler = (err: Error) => {
  // eslint-disable-next-line
  console.error(err.stack);
  throw Boom.boomify(err, { statusCode: 400 });
};

export function initTransactionGroupsApi(core: InternalCoreSetup) {
  const { server } = core.http;

  server.route({
    method: 'GET',
    path: '/api/apm/services/{serviceName}/transaction_groups',
    options: {
      validate: {
        query: withDefaultValidators({
          transactionType: Joi.string()
        })
      },
      tags: ['access:apm']
    },
    handler: req => {
      const { serviceName } = req.params;
      const { transactionType } = req.query as { transactionType?: string };
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
    path: `/api/apm/services/{serviceName}/transaction_groups/charts`,
    options: {
      validate: {
        query: withDefaultValidators({
          transactionType: Joi.string(),
          transactionName: Joi.string()
        })
      },
      tags: ['access:apm']
    },
    handler: req => {
      const setup = setupRequest(req);
      const { serviceName } = req.params;
      const { transactionType, transactionName } = req.query as {
        transactionType?: string;
        transactionName?: string;
      };

      return getTransactionCharts({
        serviceName,
        transactionType,
        transactionName,
        setup
      }).catch(defaultErrorHandler);
    }
  });

  server.route({
    method: 'GET',
    path: `/api/apm/services/{serviceName}/transaction_groups/distribution`,
    options: {
      validate: {
        query: withDefaultValidators({
          transactionType: Joi.string(),
          transactionName: Joi.string(),
          transactionId: Joi.string().default(''),
          traceId: Joi.string().default('')
        })
      },
      tags: ['access:apm']
    },
    handler: req => {
      const setup = setupRequest(req);
      const { serviceName } = req.params;
      const {
        transactionType,
        transactionName,
        transactionId,
        traceId
      } = req.query as {
        transactionType: string;
        transactionName: string;
        transactionId: string;
        traceId: string;
      };

      return getTransactionDistribution({
        serviceName,
        transactionType,
        transactionName,
        transactionId,
        traceId,
        setup
      }).catch(defaultErrorHandler);
    }
  });
}
