/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { jsonRt, toBooleanRt, toNumberRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { offsetRt } from '../../../common/comparison_rt';
import type { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { latencyAggregationTypeRt } from '../../../common/latency_aggregation_types';
import { joinByKey } from '../../../common/utils/join_by_key';
import { getApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import type { ColdstartRateResponse } from '../../lib/transaction_groups/get_coldstart_rate';
import { getColdstartRatePeriods } from '../../lib/transaction_groups/get_coldstart_rate';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import {
  environmentRt,
  filtersRt,
  kueryRt,
  rangeRt,
  serviceTransactionDataSourceRt,
  transactionDataSourceRt,
} from '../default_api_types';
import type { ServiceTransactionGroupsResponse } from '../services/get_service_transaction_groups';
import { getServiceTransactionGroups } from '../services/get_service_transaction_groups';
import { getServiceTransactionGroupsAlerts } from '../services/get_service_transaction_groups_alerts';
import type { ServiceTransactionGroupDetailedStatisticsResponse } from '../services/get_service_transaction_group_detailed_statistics';
import { getServiceTransactionGroupDetailedStatisticsPeriods } from '../services/get_service_transaction_group_detailed_statistics';
import type { TransactionBreakdownResponse } from './breakdown';
import { getTransactionBreakdown } from './breakdown';
import type { FailedTransactionRateResponse } from './get_failed_transaction_rate_periods';
import { getFailedTransactionRatePeriods } from './get_failed_transaction_rate_periods';
import type { TransactionLatencyResponse } from './get_latency_charts';
import { getLatencyPeriods } from './get_latency_charts';
import type { TransactionTraceSamplesResponse } from './trace_samples';
import { getTraceSamples } from './trace_samples';

export interface MergedServiceTransactionGroupsResponse
  extends Omit<ServiceTransactionGroupsResponse, 'transactionGroups'> {
  transactionGroups: Array<{
    alertsCount: number;
    name: string;
    transactionType?: string;
    latency?: number | null;
    throughput?: number;
    errorRate?: number;
    impact?: number;
  }>;
}

const transactionGroupsMainStatisticsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      t.partial({ searchQuery: t.string }),
      environmentRt,
      rangeRt,
      t.type({
        kuery: t.string,
        useDurationSummary: toBooleanRt,
        transactionType: t.string,
        latencyAggregationType: latencyAggregationTypeRt,
      }),
      transactionDataSourceRt,
    ]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<MergedServiceTransactionGroupsResponse> => {
    const { params } = resources;
    const [apmEventClient, apmAlertsClient] = await Promise.all([
      getApmEventClient(resources),
      getApmAlertsClient(resources),
    ]);

    const {
      path: { serviceName },
      query: {
        environment,
        kuery,
        latencyAggregationType,
        transactionType,
        start,
        end,
        documentType,
        rollupInterval,
        useDurationSummary,
        searchQuery,
      },
    } = params;

    const commonProps = {
      environment,
      kuery,
      serviceName,
      transactionType,
      latencyAggregationType,
      start,
      end,
      searchQuery,
    };

    const [serviceTransactionGroups, serviceTransactionGroupsAlerts] = await Promise.all([
      getServiceTransactionGroups({
        apmEventClient,
        documentType,
        rollupInterval,
        useDurationSummary,
        ...commonProps,
      }),
      getServiceTransactionGroupsAlerts({
        apmAlertsClient,
        ...commonProps,
      }),
    ]);

    const { transactionGroups, maxCountExceeded, transactionOverflowCount } =
      serviceTransactionGroups;

    const transactionGroupsWithAlerts = joinByKey(
      [...transactionGroups, ...serviceTransactionGroupsAlerts],
      'name'
    );

    return {
      transactionGroups: transactionGroupsWithAlerts,
      maxCountExceeded,
      transactionOverflowCount,
      hasActiveAlerts: !!serviceTransactionGroupsAlerts.length,
    };
  },
});

const transactionGroupsDetailedStatisticsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      environmentRt,
      kueryRt,
      rangeRt,
      t.intersection([
        offsetRt,
        transactionDataSourceRt,
        t.type({
          bucketSizeInSeconds: toNumberRt,
          useDurationSummary: toBooleanRt,
        }),
      ]),
      t.type({
        transactionNames: jsonRt.pipe(t.array(t.string)),
        transactionType: t.string,
        latencyAggregationType: latencyAggregationTypeRt,
      }),
    ]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServiceTransactionGroupDetailedStatisticsResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;

    const {
      path: { serviceName },
      query: {
        environment,
        kuery,
        start,
        end,
        offset,
        documentType,
        rollupInterval,
        bucketSizeInSeconds,
        useDurationSummary,
        transactionNames,
        transactionType,
        latencyAggregationType,
      },
    } = params;

    return getServiceTransactionGroupDetailedStatisticsPeriods({
      environment,
      kuery,
      apmEventClient,
      serviceName,
      transactionNames,
      transactionType,
      documentType,
      rollupInterval,
      bucketSizeInSeconds,
      useDurationSummary,
      latencyAggregationType,
      start,
      end,
      offset,
    });
  },
});

const transactionLatencyChartsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/transactions/charts/latency',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({
        transactionType: t.string,
        latencyAggregationType: latencyAggregationTypeRt,
        bucketSizeInSeconds: toNumberRt,
        useDurationSummary: toBooleanRt,
      }),
      t.partial({ transactionName: t.string, filters: filtersRt }),
      t.intersection([environmentRt, kueryRt, rangeRt, offsetRt]),
      serviceTransactionDataSourceRt,
    ]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<TransactionLatencyResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params, logger } = resources;

    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      filters,
      transactionType,
      transactionName,
      latencyAggregationType,
      start,
      end,
      offset,
      documentType,
      rollupInterval,
      bucketSizeInSeconds,
      useDurationSummary,
    } = params.query;

    const options = {
      environment,
      kuery,
      filters,
      serviceName,
      transactionType,
      transactionName,
      apmEventClient,
      logger,
      start,
      end,
      documentType,
      rollupInterval,
      bucketSizeInSeconds,
      useDurationSummary,
    };

    return getLatencyPeriods({
      ...options,
      latencyAggregationType: latencyAggregationType as LatencyAggregationType,
      offset,
    });
  },
});

const transactionTraceSamplesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/transactions/traces/samples',
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
  security: { authz: { requiredPrivileges: ['apm'] } },
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
  endpoint: 'GET /internal/apm/services/{serviceName}/transaction/charts/breakdown',
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
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<TransactionBreakdownResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params, config } = resources;

    const { serviceName } = params.path;
    const { environment, kuery, transactionName, transactionType, start, end } = params.query;

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
  endpoint: 'GET /internal/apm/services/{serviceName}/transactions/charts/error_rate',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({ transactionType: t.string, bucketSizeInSeconds: toNumberRt }),
      t.partial({ transactionName: t.string, filters: filtersRt }),
      t.intersection([environmentRt, kueryRt, rangeRt, offsetRt, serviceTransactionDataSourceRt]),
    ]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<FailedTransactionRateResponse> => {
    const apmEventClient = await getApmEventClient(resources);

    const { params } = resources;
    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      filters,
      transactionType,
      transactionName,
      start,
      end,
      offset,
      documentType,
      rollupInterval,
      bucketSizeInSeconds,
    } = params.query;

    return getFailedTransactionRatePeriods({
      environment,
      kuery,
      filters,
      serviceName,
      transactionType,
      transactionName,
      apmEventClient,
      start,
      end,
      offset,
      documentType,
      rollupInterval,
      bucketSizeInSeconds,
    });
  },
});

const transactionChartsColdstartRateRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({ transactionType: t.string }),
      t.intersection([environmentRt, kueryRt, rangeRt, offsetRt]),
    ]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ColdstartRateResponse> => {
    const apmEventClient = await getApmEventClient(resources);

    const { params, config } = resources;
    const { serviceName } = params.path;
    const { environment, kuery, transactionType, start, end, offset } = params.query;

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

const transactionChartsColdstartRateByTransactionNameRoute = createApmServerRoute({
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
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ColdstartRateResponse> => {
    const apmEventClient = await getApmEventClient(resources);

    const { params, config } = resources;
    const { serviceName } = params.path;
    const { environment, kuery, transactionType, transactionName, start, end, offset } =
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
