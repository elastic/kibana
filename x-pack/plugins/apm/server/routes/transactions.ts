/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { jsonRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import {
  LatencyAggregationType,
  latencyAggregationTypeRt,
} from '../../common/latency_aggregation_types';
import { getSearchAggregatedTransactions } from '../lib/helpers/aggregated_transactions';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceTransactionGroups } from '../lib/services/get_service_transaction_groups';
import { getServiceTransactionGroupDetailedStatisticsPeriods } from '../lib/services/get_service_transaction_group_detailed_statistics';
import { getTransactionBreakdown } from '../lib/transactions/breakdown';
import { getTransactionDistribution } from '../lib/transactions/distribution';
import { getAnomalySeries } from '../lib/transactions/get_anomaly_data';
import { getLatencyPeriods } from '../lib/transactions/get_latency_charts';
import { getThroughputCharts } from '../lib/transactions/get_throughput_charts';
import { getTransactionGroupList } from '../lib/transaction_groups';
import { getErrorRatePeriods } from '../lib/transaction_groups/get_error_rate';
import { createApmServerRoute } from './create_apm_server_route';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';
import {
  comparisonRangeRt,
  environmentRt,
  rangeRt,
  kueryRt,
} from './default_api_types';

/**
 * Returns a list of transactions grouped by name
 * //TODO: delete this once we moved away from the old table in the transaction overview page. It should be replaced by /transactions/groups/main_statistics/
 */
const transactionGroupsRoute = createApmServerRoute({
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
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { environment, kuery, transactionType } = params.query;

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

const transactionGroupsMainStatisticsRoute = createApmServerRoute({
  endpoint:
    'GET /api/apm/services/{serviceName}/transactions/groups/main_statistics',
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
  handler: async (resources) => {
    const { params } = resources;
    const setup = await setupRequest(resources);

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    const {
      path: { serviceName },
      query: { environment, kuery, latencyAggregationType, transactionType },
    } = params;

    return getServiceTransactionGroups({
      environment,
      kuery,
      setup,
      serviceName,
      searchAggregatedTransactions,
      transactionType,
      latencyAggregationType,
    });
  },
});

const transactionGroupsDetailedStatisticsRoute = createApmServerRoute({
  endpoint:
    'GET /api/apm/services/{serviceName}/transactions/groups/detailed_statistics',
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
  handler: async (resources) => {
    const setup = await setupRequest(resources);

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    const { params } = resources;

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
    } = params;

    return await getServiceTransactionGroupDetailedStatisticsPeriods({
      environment,
      kuery,
      setup,
      serviceName,
      transactionNames,
      searchAggregatedTransactions,
      transactionType,
      numBuckets,
      latencyAggregationType,
      comparisonStart,
      comparisonEnd,
    });
  },
});

const transactionLatencyChartsRoute = createApmServerRoute({
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
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params, logger } = resources;

    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      transactionType,
      transactionName,
      latencyAggregationType,
      comparisonStart,
      comparisonEnd,
    } = params.query;

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

const transactionThroughputChartsRoute = createApmServerRoute({
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
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;

    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      transactionType,
      transactionName,
    } = params.query;

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

const transactionChartsDistributionRoute = createApmServerRoute({
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
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      transactionType,
      transactionName,
      transactionId = '',
      traceId = '',
    } = params.query;

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

const transactionChartsBreakdownRoute = createApmServerRoute({
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
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;

    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      transactionName,
      transactionType,
    } = params.query;

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

const transactionChartsErrorRateRoute = createApmServerRoute({
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
  handler: async (resources) => {
    const setup = await setupRequest(resources);

    const { params } = resources;
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

export const transactionRouteRepository = createApmServerRouteRepository()
  .add(transactionGroupsRoute)
  .add(transactionGroupsMainStatisticsRoute)
  .add(transactionGroupsDetailedStatisticsRoute)
  .add(transactionLatencyChartsRoute)
  .add(transactionThroughputChartsRoute)
  .add(transactionChartsDistributionRoute)
  .add(transactionChartsBreakdownRoute)
  .add(transactionChartsErrorRateRoute);
