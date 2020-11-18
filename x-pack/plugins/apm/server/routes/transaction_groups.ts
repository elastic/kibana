/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import Boom from '@hapi/boom';
import { setupRequest } from '../lib/helpers/setup_request';
import { getTransactionCharts } from '../lib/transactions/charts';
import { getTransactionDistribution } from '../lib/transactions/distribution';
import { getTransactionBreakdown } from '../lib/transactions/breakdown';
import { getTransactionGroupList } from '../lib/transaction_groups';
import { createRoute } from './create_route';
import { uiFiltersRt, rangeRt } from './default_api_types';
import { getTransactionSampleForGroup } from '../lib/transaction_groups/get_transaction_sample_for_group';
import { getSearchAggregatedTransactions } from '../lib/helpers/aggregated_transactions';
import { getErrorRate } from '../lib/transaction_groups/get_error_rate';
import { getThroughput } from '../lib/transaction_groups/get_throughput';

export const transactionGroupsRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/transaction_groups',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({
        transactionType: t.string,
      }),
      uiFiltersRt,
      rangeRt,
    ]),
  }),
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const { transactionType } = context.params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getTransactionGroupList(
      {
        type: 'top_transactions',
        serviceName,
        transactionType,
        searchAggregatedTransactions,
      },
      setup
    );
  },
});

export const transactionGroupsChartsRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/transaction_groups/charts',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.partial({
        transactionType: t.string,
        transactionName: t.string,
      }),
      uiFiltersRt,
      rangeRt,
    ]),
  }),
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const logger = context.logger;
    const { serviceName } = context.params.path;
    const { transactionType, transactionName } = context.params.query;

    if (!setup.uiFilters.environment) {
      throw Boom.badRequest(
        `environment is a required property of the ?uiFilters JSON for transaction_groups/charts.`
      );
    }

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    const options = {
      serviceName,
      transactionType,
      transactionName,
      setup,
      searchAggregatedTransactions,
      logger,
    };

    return getTransactionCharts(options);
  },
});

export const transactionGroupsDistributionRoute = createRoute({
  endpoint:
    'GET /api/apm/services/{serviceName}/transaction_groups/distribution',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({
        transactionType: t.string,
        transactionName: t.string,
      }),
      t.partial({
        transactionId: t.string,
        traceId: t.string,
      }),
      uiFiltersRt,
      rangeRt,
    ]),
  }),
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const {
      transactionType,
      transactionName,
      transactionId = '',
      traceId = '',
    } = context.params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getTransactionDistribution({
      serviceName,
      transactionType,
      transactionName,
      transactionId,
      traceId,
      setup,
      searchAggregatedTransactions,
    });
  },
});

export const transactionGroupsBreakdownRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/transaction_groups/breakdown',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({
        transactionType: t.string,
      }),
      t.partial({
        transactionName: t.string,
      }),
      uiFiltersRt,
      rangeRt,
    ]),
  }),
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const { transactionName, transactionType } = context.params.query;

    return getTransactionBreakdown({
      serviceName,
      transactionName,
      transactionType,
      setup,
    });
  },
});

export const transactionGroupsThroughputRoute = createRoute(() => ({
  endpoint: 'GET /api/apm/services/{serviceName}/transaction_groups/throughput',
  params: {
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({ transactionType: t.string }),
      uiFiltersRt,
      rangeRt,
    ]),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const { transactionType } = context.params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );
    return getThroughput({
      searchAggregatedTransactions,
      serviceName,
      setup,
      transactionType,
    });
  },
}));

export const transactionSampleForGroupRoute = createRoute({
  endpoint: `GET /api/apm/transaction_sample`,
  params: t.type({
    query: t.intersection([
      uiFiltersRt,
      rangeRt,
      t.type({ serviceName: t.string, transactionName: t.string }),
    ]),
  }),
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const { transactionName, serviceName } = context.params.query;

    return {
      transaction: await getTransactionSampleForGroup({
        setup,
        serviceName,
        transactionName,
      }),
    };
  },
});

export const transactionGroupsErrorRateRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/transaction_groups/error_rate',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      uiFiltersRt,
      rangeRt,
      t.partial({
        transactionType: t.string,
        transactionName: t.string,
      }),
    ]),
  }),
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { params } = context;
    const { serviceName } = params.path;
    const { transactionType, transactionName } = params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getErrorRate({
      serviceName,
      transactionType,
      transactionName,
      setup,
      searchAggregatedTransactions,
    });
  },
});
