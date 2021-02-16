/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  LatencyAggregationType,
  latencyAggregationTypeRt,
} from '../../common/latency_aggregation_types';
import { jsonRt } from '../../common/runtime_types/json_rt';
import { toNumberRt } from '../../common/runtime_types/to_number_rt';
import { getSearchAggregatedTransactions } from '../lib/helpers/aggregated_transactions';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceTransactionGroups } from '../lib/services/get_service_transaction_groups';
import { getServiceTransactionGroupComparisonStatistics } from '../lib/services/get_service_transaction_group_comparison_statistics';
import { getTransactionBreakdown } from '../lib/transactions/breakdown';
import { getTransactionDistribution } from '../lib/transactions/distribution';
import { getAnomalySeries } from '../lib/transactions/get_anomaly_data';
import { getLatencyTimeseries } from '../lib/transactions/get_latency_charts';
import { getThroughputCharts } from '../lib/transactions/get_throughput_charts';
import { getTransactionGroupList } from '../lib/transaction_groups';
import { getErrorRate } from '../lib/transaction_groups/get_error_rate';
import { createRoute } from './create_route';
import { environmentRt, rangeRt, uiFiltersRt } from './default_api_types';

/**
 * Returns a list of transactions grouped by name
 * //TODO: delete this once we moved away from the old table in the transaction overview page. It should be replaced by /transactions/groups/primary_statistics/
 */
export const transactionGroupsRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/transactions/groups',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({ transactionType: t.string }),
      environmentRt,
      uiFiltersRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const { environment, transactionType } = context.params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getTransactionGroupList(
      {
        environment,
        type: 'top_transactions',
        serviceName,
        transactionType,
        searchAggregatedTransactions,
      },
      setup
    );
  },
});

export const transactionGroupsPrimaryStatisticsRoute = createRoute({
  endpoint:
    'GET /api/apm/services/{serviceName}/transactions/groups/primary_statistics',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      environmentRt,
      rangeRt,
      uiFiltersRt,
      t.type({
        transactionType: t.string,
        latencyAggregationType: latencyAggregationTypeRt,
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
      query: { environment, latencyAggregationType, transactionType },
    } = context.params;

    return getServiceTransactionGroups({
      environment,
      setup,
      serviceName,
      searchAggregatedTransactions,
      transactionType,
      latencyAggregationType: latencyAggregationType as LatencyAggregationType,
    });
  },
});

export const transactionGroupsComparisonStatisticsRoute = createRoute({
  endpoint:
    'GET /api/apm/services/{serviceName}/transactions/groups/comparison_statistics',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      environmentRt,
      rangeRt,
      uiFiltersRt,
      t.type({
        transactionNames: jsonRt,
        numBuckets: toNumberRt,
        transactionType: t.string,
        latencyAggregationType: latencyAggregationTypeRt,
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
      query: {
        environment,
        transactionNames,
        latencyAggregationType,
        numBuckets,
        transactionType,
      },
    } = context.params;

    return getServiceTransactionGroupComparisonStatistics({
      environment,
      setup,
      serviceName,
      transactionNames,
      searchAggregatedTransactions,
      transactionType,
      numBuckets,
      latencyAggregationType: latencyAggregationType as LatencyAggregationType,
    });
  },
});

export const transactionLatencyChartsRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/transactions/charts/latency',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.partial({
        transactionName: t.string,
      }),
      t.type({
        transactionType: t.string,
        latencyAggregationType: latencyAggregationTypeRt,
      }),
      environmentRt,
      uiFiltersRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const logger = context.logger;
    const { serviceName } = context.params.path;
    const {
      environment,
      transactionType,
      transactionName,
      latencyAggregationType,
    } = context.params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    const options = {
      environment,
      serviceName,
      transactionType,
      transactionName,
      setup,
      searchAggregatedTransactions,
      logger,
    };

    const [latencyData, anomalyTimeseries] = await Promise.all([
      getLatencyTimeseries({
        ...options,
        latencyAggregationType: latencyAggregationType as LatencyAggregationType,
      }),
      getAnomalySeries(options).catch((error) => {
        logger.warn(`Unable to retrieve anomalies for latency charts.`);
        logger.error(error);
        return undefined;
      }),
    ]);

    const { latencyTimeseries, overallAvgDuration } = latencyData;

    return {
      latencyTimeseries,
      overallAvgDuration,
      anomalyTimeseries,
    };
  },
});

export const transactionThroughputChartsRoute = createRoute({
  endpoint:
    'GET /api/apm/services/{serviceName}/transactions/charts/throughput',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({ transactionType: t.string }),
      t.partial({ transactionName: t.string }),
      uiFiltersRt,
      rangeRt,
      environmentRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const {
      environment,
      transactionType,
      transactionName,
    } = context.params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return await getThroughputCharts({
      environment,
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
      environmentRt,
      uiFiltersRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const {
      environment,
      transactionType,
      transactionName,
      transactionId = '',
      traceId = '',
    } = context.params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getTransactionDistribution({
      environment,
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
      t.type({ transactionType: t.string }),
      t.partial({ transactionName: t.string }),
      environmentRt,
      uiFiltersRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const {
      environment,
      transactionName,
      transactionType,
    } = context.params.query;

    return getTransactionBreakdown({
      environment,
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
      environmentRt,
      uiFiltersRt,
      rangeRt,
      t.type({ transactionType: t.string }),
      t.partial({ transactionName: t.string }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { params } = context;
    const { serviceName } = params.path;
    const { environment, transactionType, transactionName } = params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getErrorRate({
      environment,
      serviceName,
      transactionType,
      transactionName,
      setup,
      searchAggregatedTransactions,
    });
  },
});
