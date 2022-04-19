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
import { getSearchAggregatedTransactions } from '../../lib/helpers/transactions';
import { setupRequest } from '../../lib/helpers/setup_request';
import { getServiceTransactionGroups } from '../services/get_service_transaction_groups';
import { getServiceTransactionGroupDetailedStatisticsPeriods } from '../services/get_service_transaction_group_detailed_statistics';
import { getTransactionBreakdown } from './breakdown';
import { getTransactionTraceSamples } from './trace_samples';
import { getLatencyPeriods } from './get_latency_charts';
import { getFailedTransactionRatePeriods } from './get_failed_transaction_rate_periods';
import { getColdstartRatePeriods } from '../../lib/transaction_groups/get_coldstart_rate';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt, rangeRt } from '../default_api_types';
import { offsetRt } from '../../../common/offset_rt';

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
  handler: async (
    resources
  ): Promise<{
    transactionGroups: Array<{
      transactionType: string;
      name: string;
      latency: number | null;
      throughput: number;
      errorRate: number;
      impact: number;
    }>;
    isAggregationAccurate: boolean;
    bucketSize: number;
  }> => {
    const { params } = resources;
    const setup = await setupRequest(resources);
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

    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      ...setup,
      kuery,
      start,
      end,
    });

    return getServiceTransactionGroups({
      environment,
      kuery,
      setup,
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
  ): Promise<{
    currentPeriod: import('./../../../../../../node_modules/@types/lodash/index').Dictionary<{
      transactionName: string;
      latency: Array<import('./../../../typings/timeseries').Coordinate>;
      throughput: Array<import('./../../../typings/timeseries').Coordinate>;
      errorRate: Array<import('./../../../typings/timeseries').Coordinate>;
      impact: number;
    }>;
    previousPeriod: import('./../../../../../../node_modules/@types/lodash/index').Dictionary<{
      errorRate: Array<{
        x: number;
        y: import('./../../../typings/common').Maybe<number>;
      }>;
      throughput: Array<{
        x: number;
        y: import('./../../../typings/common').Maybe<number>;
      }>;
      latency: Array<{
        x: number;
        y: import('./../../../typings/common').Maybe<number>;
      }>;
      transactionName: string;
      impact: number;
    }>;
  }> => {
    const setup = await setupRequest(resources);
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
        start,
        end,
        offset,
      },
    } = params;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      ...setup,
      kuery,
      start,
      end,
    });

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
  handler: async (
    resources
  ): Promise<{
    currentPeriod: {
      overallAvgDuration: number | null;
      latencyTimeseries: Array<{ x: number; y: number | null }>;
    };
    previousPeriod:
      | {
          latencyTimeseries: Array<{
            x: number;
            y: import('./../../../typings/common').Maybe<number>;
          }>;
          overallAvgDuration: number | null;
        }
      | {
          latencyTimeseries: Array<{
            x: number;
            y: import('./../../../typings/common').Maybe<number>;
          }>;
          overallAvgDuration: null;
        };
  }> => {
    const setup = await setupRequest(resources);
    const { params, logger } = resources;

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

    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      ...setup,
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
      setup,
      searchAggregatedTransactions,
      logger,
      start,
      end,
    };

    const { currentPeriod, previousPeriod } = await getLatencyPeriods({
      ...options,
      latencyAggregationType: latencyAggregationType as LatencyAggregationType,
      offset,
    });

    return {
      currentPeriod,
      previousPeriod,
    };
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
  handler: async (
    resources
  ): Promise<{
    traceSamples: Array<{ transactionId: string; traceId: string }>;
  }> => {
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
      sampleRangeFrom,
      sampleRangeTo,
      start,
      end,
    } = params.query;

    return getTransactionTraceSamples({
      environment,
      kuery,
      serviceName,
      transactionType,
      transactionName,
      transactionId,
      traceId,
      sampleRangeFrom,
      sampleRangeTo,
      setup,
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
  handler: async (
    resources
  ): Promise<{
    timeseries: Array<{
      title: string;
      color: string;
      type: string;
      data: Array<{ x: number; y: number | null }>;
      hideLegend: boolean;
      legendValue: string;
    }>;
  }> => {
    const setup = await setupRequest(resources);
    const { params } = resources;

    const { serviceName } = params.path;
    const { environment, kuery, transactionName, transactionType, start, end } =
      params.query;

    return getTransactionBreakdown({
      environment,
      kuery,
      serviceName,
      transactionName,
      transactionType,
      setup,
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
  handler: async (
    resources
  ): Promise<{
    currentPeriod: {
      timeseries: Array<import('./../../../typings/timeseries').Coordinate>;
      average: number | null;
    };
    previousPeriod:
      | {
          timeseries: Array<{
            x: number;
            y: import('./../../../typings/common').Maybe<number>;
          }>;
          average: number | null;
        }
      | {
          timeseries: Array<{
            x: number;
            y: import('./../../../typings/common').Maybe<number>;
          }>;
          average: null;
        };
  }> => {
    const setup = await setupRequest(resources);

    const { params } = resources;
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

    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      ...setup,
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
      setup,
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
  handler: async (
    resources
  ): Promise<{
    currentPeriod: {
      transactionColdstartRate: Array<
        import('../../../typings/timeseries').Coordinate
      >;
      average: number | null;
    };
    previousPeriod:
      | {
          transactionColdstartRate: Array<{
            x: number;
            y: import('../../../typings/common').Maybe<number>;
          }>;
          average: number | null;
        }
      | {
          transactionColdstartRate: Array<{
            x: number;
            y: import('../../../typings/common').Maybe<number>;
          }>;
          average: null;
        };
  }> => {
    const setup = await setupRequest(resources);

    const { params } = resources;
    const { serviceName } = params.path;
    const { environment, kuery, transactionType, start, end, offset } =
      params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      ...setup,
      kuery,
      start,
      end,
    });

    return getColdstartRatePeriods({
      environment,
      kuery,
      serviceName,
      transactionType,
      setup,
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
    handler: async (
      resources
    ): Promise<{
      currentPeriod: {
        transactionColdstartRate: Array<
          import('../../../typings/timeseries').Coordinate
        >;
        average: number | null;
      };
      previousPeriod:
        | {
            transactionColdstartRate: Array<{
              x: number;
              y: import('../../../typings/common').Maybe<number>;
            }>;
            average: number | null;
          }
        | {
            transactionColdstartRate: Array<{
              x: number;
              y: import('../../../typings/common').Maybe<number>;
            }>;
            average: null;
          };
    }> => {
      const setup = await setupRequest(resources);

      const { params } = resources;
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

      const searchAggregatedTransactions =
        await getSearchAggregatedTransactions({
          ...setup,
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
        setup,
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
