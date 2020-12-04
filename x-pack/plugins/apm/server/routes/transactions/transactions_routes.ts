/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import Boom from '@hapi/boom';
import { setupRequest } from '../../lib/helpers/setup_request';
import { getTransactionCharts } from '../../lib/transactions/charts';
import { getTransactionDistribution } from '../../lib/transactions/distribution';
import { getTransactionBreakdown } from '../../lib/transactions/breakdown';
import { getTransactionGroupList } from '../../lib/transaction_groups';
import { createRoute } from '../create_route';
import { uiFiltersRt, rangeRt } from '../default_api_types';
import { getTransactionSampleForGroup } from '../../lib/transaction_groups/get_transaction_sample_for_group';
import { getSearchAggregatedTransactions } from '../../lib/helpers/aggregated_transactions';
import { getErrorRate } from '../../lib/transaction_groups/get_error_rate';

/**
 * Returns a list of transactions grouped by name
 * //TODO: delete this once we moved away from the old table in the transaction overview page. It should be replaced by /transactions/groups/overview/
 */
export const transactionsGroupsRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/transactions/groups',
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
  options: { tags: ['access:apm'] },
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

/**
 * Returns timeseries for latency, throughput and anomalies
 * TODO: break it into 3 new APIs:
 * - Latency: /transactions/charts/latency
 * - Throughput: /transactions/charts/throughput
 * - anomalies: /transactions/charts/anomaly
 */
export const transactionsChartsRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/transactions/charts',
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
  options: { tags: ['access:apm'] },
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

export const transactionsChartsDistributionRoute = createRoute({
  endpoint:
    'GET /api/apm/services/{serviceName}/transactions/charts/distribution',
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
  options: { tags: ['access:apm'] },
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

export const transactionsChartsBreakdownRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/transaction/charts/breakdown',
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
  options: { tags: ['access:apm'] },
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

export const transactionsChartsErrorRateRoute = createRoute({
  endpoint:
    'GET /api/apm/services/{serviceName}/transactions/charts/error_rate',
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
  options: { tags: ['access:apm'] },
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
