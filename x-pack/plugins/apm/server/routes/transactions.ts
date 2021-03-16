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
import { getServiceTransactionGroupComparisonStatisticsPeriods } from '../lib/services/get_service_transaction_group_comparison_statistics';
import { getTransactionBreakdown } from '../lib/transactions/breakdown';
import { getTransactionDistribution } from '../lib/transactions/distribution';
import { getAnomalySeries } from '../lib/transactions/get_anomaly_data';
import { getLatencyPeriods } from '../lib/transactions/get_latency_charts';
import { getThroughputCharts } from '../lib/transactions/get_throughput_charts';
import { getTransactionGroupList } from '../lib/transaction_groups';
import { getErrorRatePeriods } from '../lib/transaction_groups/get_error_rate';
import { createRoute } from './create_route';
import {
  comparisonRangeRt,
  environmentRt,
  rangeRt,
  kueryRt,
} from './default_api_types';

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
      kueryRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const { environment, kuery, transactionType } = context.params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getTransactionGroupList(
      {
        environment,
        kuery,
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
      kueryRt,
      rangeRt,
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
      query: { environment, kuery, latencyAggregationType, transactionType },
    } = context.params;

    return getServiceTransactionGroups({
      environment,
      kuery,
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
      kueryRt,
      rangeRt,
      comparisonRangeRt,
      t.type({
        transactionNames: jsonRt.pipe(t.array(t.string)),
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
        kuery,
        transactionNames,
        latencyAggregationType,
        numBuckets,
        transactionType,
        comparisonStart,
        comparisonEnd,
      },
    } = context.params;

    return await getServiceTransactionGroupComparisonStatisticsPeriods({
      environment,
      kuery,
      setup,
      serviceName,
      transactionNames,
      searchAggregatedTransactions,
      transactionType,
      numBuckets,
      latencyAggregationType: latencyAggregationType as LatencyAggregationType,
      comparisonStart,
      comparisonEnd,
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
      t.type({
        transactionType: t.string,
        latencyAggregationType: latencyAggregationTypeRt,
      }),
      t.partial({ transactionName: t.string }),
      t.intersection([environmentRt, kueryRt, rangeRt, comparisonRangeRt]),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const logger = context.logger;
    const { serviceName } = context.params.path;
    const {
      environment,
      kuery,
      transactionType,
      transactionName,
      latencyAggregationType,
      comparisonStart,
      comparisonEnd,
    } = context.params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    const options = {
      environment,
      kuery,
      serviceName,
      transactionType,
      transactionName,
      setup,
      searchAggregatedTransactions,
      logger,
    };

    const [
      { currentPeriod, previousPeriod },
      anomalyTimeseries,
    ] = await Promise.all([
      getLatencyPeriods({
        ...options,
        latencyAggregationType: latencyAggregationType as LatencyAggregationType,
        comparisonStart,
        comparisonEnd,
      }),
      getAnomalySeries(options).catch((error) => {
        logger.warn(`Unable to retrieve anomalies for latency charts.`);
        logger.error(error);
        return undefined;
      }),
    ]);

    return {
      currentPeriod,
      previousPeriod,
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
      environmentRt,
      kueryRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const {
      environment,
      kuery,
      transactionType,
      transactionName,
    } = context.params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return await getThroughputCharts({
      environment,
      kuery,
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
      kueryRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const {
      environment,
      kuery,
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
      kuery,
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
      kueryRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const {
      environment,
      kuery,
      transactionName,
      transactionType,
    } = context.params.query;

    return getTransactionBreakdown({
      environment,
      kuery,
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
      t.type({ transactionType: t.string }),
      t.partial({ transactionName: t.string }),
      t.intersection([environmentRt, kueryRt, rangeRt, comparisonRangeRt]),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { params } = context;
    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      transactionType,
      transactionName,
      comparisonStart,
      comparisonEnd,
    } = params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getErrorRatePeriods({
      environment,
      kuery,
      serviceName,
      transactionType,
      transactionName,
      setup,
      searchAggregatedTransactions,
      comparisonStart,
      comparisonEnd,
    });
  },
});
