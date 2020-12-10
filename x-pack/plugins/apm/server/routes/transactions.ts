/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import * as t from 'io-ts';
import { createRoute } from './create_route';
import { rangeRt, uiFiltersRt } from './default_api_types';
import { toNumberRt } from '../../common/runtime_types/to_number_rt';
import { getSearchAggregatedTransactions } from '../lib/helpers/aggregated_transactions';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceTransactionGroups } from '../lib/services/get_service_transaction_groups';
import { getTransactionBreakdown } from '../lib/transactions/breakdown';
import { getAnomalySeries } from '../lib/transactions/get_anomaly_data';
import { getTransactionDistribution } from '../lib/transactions/distribution';
import { getTransactionGroupList } from '../lib/transaction_groups';
import { getErrorRate } from '../lib/transaction_groups/get_error_rate';
import { getLatencyTimeseries } from '../lib/transactions/get_latency_charts';
import { getThroughputCharts } from '../lib/transactions/get_throughput_charts';

/**
 * Returns a list of transactions grouped by name
 * //TODO: delete this once we moved away from the old table in the transaction overview page. It should be replaced by /transactions/groups/overview/
 */
export const transactionGroupsRoute = createRoute({
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

export const transactionGroupsOverviewRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/transactions/groups/overview',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      rangeRt,
      uiFiltersRt,
      t.type({
        size: toNumberRt,
        numBuckets: toNumberRt,
        pageIndex: toNumberRt,
        sortDirection: t.union([t.literal('asc'), t.literal('desc')]),
        sortField: t.union([
          t.literal('latency'),
          t.literal('throughput'),
          t.literal('errorRate'),
          t.literal('impact'),
        ]),
      }),
    ]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    const {
      path: { serviceName },
      query: { size, numBuckets, pageIndex, sortDirection, sortField },
    } = context.params;

    return getServiceTransactionGroups({
      setup,
      serviceName,
      pageIndex,
      searchAggregatedTransactions,
      size,
      sortDirection,
      sortField,
      numBuckets,
    });
  },
});

export const transactionLatencyChatsRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/transactions/charts/latency',
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
    };

    const {
      latencyTimeseries,
      overallAvgDuration,
    } = await getLatencyTimeseries(options);

    const anomalyTimeseries = await getAnomalySeries({
      ...options,
      logger,
      latencyTimeseries,
    });

    return { latencyTimeseries, overallAvgDuration, anomalyTimeseries };
  },
});

export const transactionThroughputChatsRoute = createRoute({
  endpoint:
    'GET /api/apm/services/{serviceName}/transactions/charts/throughput',
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

    return await getThroughputCharts({
      serviceName,
      transactionType,
      transactionName,
      setup,
      searchAggregatedTransactions,
    });
  },
});

export const transactionChartsDistributionRoute = createRoute({
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

export const transactionChartsBreakdownRoute = createRoute({
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

export const transactionChartsErrorRateRoute = createRoute({
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
