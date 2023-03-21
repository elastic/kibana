/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { jsonRt, toNumberRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import {
  LatencyAggregationType,
  latencyAggregationTypeRt,
} from '../../../common/latency_aggregation_types';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import {
  getServiceTransactionGroups,
  ServiceTransactionGroupsResponse,
} from '../services/get_service_transaction_groups';
import {
  getServiceTransactionGroupDetailedStatisticsPeriods,
  ServiceTransactionGroupDetailedStatisticsResponse,
} from '../services/get_service_transaction_group_detailed_statistics';
import {
  getTransactionBreakdown,
  TransactionBreakdownResponse,
} from './breakdown';
import {
  getLatencyPeriods,
  TransactionLatencyResponse,
} from './get_latency_charts';
import {
  FailedTransactionRateResponse,
  getFailedTransactionRatePeriods,
} from './get_failed_transaction_rate_periods';
import {
  ColdstartRateResponse,
  getColdstartRatePeriods,
} from '../../lib/transaction_groups/get_coldstart_rate';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt, rangeRt } from '../default_api_types';
import { offsetRt } from '../../../common/comparison_rt';
import {
  getTraceSamples,
  TransactionTraceSamplesResponse,
} from './trace_samples';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

const transactionGroupsMainStatisticsRoute = createApmServerRoute({
  endpoint:
    'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics',
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
  handler: async (resources): Promise<ServiceTransactionGroupsResponse> => {
    const { params, config } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const {
      path: { serviceName },
      query: {
        environment,
        kuery,
        latencyAggregationType,
        transactionType,
        start,
        end,
      },
    } = params;
    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config,
      kuery,
      start,
      end,
    });

    return getServiceTransactionGroups({
      environment,
      kuery,
      apmEventClient,
      serviceName,
      searchAggregatedTransactions,
      transactionType,
      latencyAggregationType,
      start,
      end,
    });
  },
});

const transactionGroupsDetailedStatisticsRoute = createApmServerRoute({
  endpoint:
    'GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      environmentRt,
      kueryRt,
      rangeRt,
      offsetRt,
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
  handler: async (
    resources
  ): Promise<ServiceTransactionGroupDetailedStatisticsResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params, config } = resources;

    const {
      path: { serviceName },
      query: {
        environment,
        kuery,
        transactionNames,
        latencyAggregationType,
        numBuckets,
        transactionType,
        start,
        end,
        offset,
      },
    } = params;

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      config,
      apmEventClient,
      kuery,
      start,
      end,
    });

    return getServiceTransactionGroupDetailedStatisticsPeriods({
      environment,
      kuery,
      apmEventClient,
      serviceName,
      transactionNames,
      searchAggregatedTransactions,
      transactionType,
      numBuckets,
      latencyAggregationType,
      start,
      end,
      offset,
    });
  },
});

const transactionLatencyChartsRoute = createApmServerRoute({
  endpoint:
    'GET /internal/apm/services/{serviceName}/transactions/charts/latency',
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
      t.intersection([environmentRt, kueryRt, rangeRt, offsetRt]),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<TransactionLatencyResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params, logger, config } = resources;

    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      transactionType,
      transactionName,
      latencyAggregationType,
      start,
      end,
      offset,
    } = params.query;

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      config,
      apmEventClient,
      kuery,
      start,
      end,
    });

    const options = {
      environment,
      kuery,
      serviceName,
      transactionType,
      transactionName,
      apmEventClient,
      searchAggregatedTransactions,
      logger,
      start,
      end,
    };

    return getLatencyPeriods({
      ...options,
      latencyAggregationType: latencyAggregationType as LatencyAggregationType,
      offset,
    });
  },
});

const transactionTraceSamplesRoute = createApmServerRoute({
  endpoint:
    'GET /internal/apm/services/{serviceName}/transactions/traces/samples',
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
        sampleRangeFrom: toNumberRt,
        sampleRangeTo: toNumberRt,
      }),
      environmentRt,
      kueryRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<TransactionTraceSamplesResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      transactionType,
      transactionName,
      transactionId = '',
      traceId = '',
      sampleRangeFrom,
      sampleRangeTo,
      start,
      end,
    } = params.query;

    return getTraceSamples({
      environment,
      kuery,
      serviceName,
      transactionType,
      transactionName,
      transactionId,
      traceId,
      sampleRangeFrom,
      sampleRangeTo,
      apmEventClient,
      start,
      end,
    });
  },
});

const transactionChartsBreakdownRoute = createApmServerRoute({
  endpoint:
    'GET /internal/apm/services/{serviceName}/transaction/charts/breakdown',
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
  handler: async (resources): Promise<TransactionBreakdownResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params, config } = resources;

    const { serviceName } = params.path;
    const { environment, kuery, transactionName, transactionType, start, end } =
      params.query;

    return getTransactionBreakdown({
      environment,
      kuery,
      serviceName,
      transactionName,
      transactionType,
      config,
      apmEventClient,
      start,
      end,
    });
  },
});

const transactionChartsErrorRateRoute = createApmServerRoute({
  endpoint:
    'GET /internal/apm/services/{serviceName}/transactions/charts/error_rate',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({ transactionType: t.string }),
      t.partial({ transactionName: t.string }),
      t.intersection([environmentRt, kueryRt, rangeRt, offsetRt]),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<FailedTransactionRateResponse> => {
    const apmEventClient = await getApmEventClient(resources);

    const { params, config } = resources;
    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      transactionType,
      transactionName,
      start,
      end,
      offset,
    } = params.query;

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      config,
      apmEventClient,
      kuery,
      start,
      end,
    });

    return getFailedTransactionRatePeriods({
      environment,
      kuery,
      serviceName,
      transactionType,
      transactionName,
      apmEventClient,
      searchAggregatedTransactions,
      start,
      end,
      offset,
    });
  },
});

const transactionChartsColdstartRateRoute = createApmServerRoute({
  endpoint:
    'GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({ transactionType: t.string }),
      t.intersection([environmentRt, kueryRt, rangeRt, offsetRt]),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<ColdstartRateResponse> => {
    const apmEventClient = await getApmEventClient(resources);

    const { params, config } = resources;
    const { serviceName } = params.path;
    const { environment, kuery, transactionType, start, end, offset } =
      params.query;

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      config,
      apmEventClient,
      kuery,
      start,
      end,
    });

    return getColdstartRatePeriods({
      environment,
      kuery,
      serviceName,
      transactionType,
      apmEventClient,
      searchAggregatedTransactions,
      start,
      end,
      offset,
    });
  },
});

const transactionChartsColdstartRateByTransactionNameRoute =
  createApmServerRoute({
    endpoint:
      'GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate_by_transaction_name',
    params: t.type({
      path: t.type({
        serviceName: t.string,
      }),
      query: t.intersection([
        t.type({ transactionType: t.string, transactionName: t.string }),
        t.intersection([environmentRt, kueryRt, rangeRt, offsetRt]),
      ]),
    }),
    options: { tags: ['access:apm'] },
    handler: async (resources): Promise<ColdstartRateResponse> => {
      const apmEventClient = await getApmEventClient(resources);

      const { params, config } = resources;
      const { serviceName } = params.path;
      const {
        environment,
        kuery,
        transactionType,
        transactionName,
        start,
        end,
        offset,
      } = params.query;

      const searchAggregatedTransactions = await getSearchTransactionsEvents({
        config,
        apmEventClient,
        kuery,
        start,
        end,
      });

      return getColdstartRatePeriods({
        environment,
        kuery,
        serviceName,
        transactionType,
        transactionName,
        apmEventClient,
        searchAggregatedTransactions,
        start,
        end,
        offset,
      });
    },
  });

export const transactionRouteRepository = {
  ...transactionGroupsMainStatisticsRoute,
  ...transactionGroupsDetailedStatisticsRoute,
  ...transactionLatencyChartsRoute,
  ...transactionTraceSamplesRoute,
  ...transactionChartsBreakdownRoute,
  ...transactionChartsErrorRateRoute,
  ...transactionChartsColdstartRateRoute,
  ...transactionChartsColdstartRateByTransactionNameRoute,
};
