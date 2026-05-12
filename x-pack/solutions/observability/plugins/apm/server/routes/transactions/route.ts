/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { LatencyAggregationType } from '@kbn/apm-types';
import {
  routeDefinitions,
  type MergedServiceTransactionGroupsResponse,
  type ServiceTransactionGroupDetailedStatisticsResponse,
  type TransactionLatencyResponse,
  type TransactionTraceSamplesResponse,
  type TransactionBreakdownResponse,
  type FailedTransactionRateResponse,
  type ColdstartRateResponse,
} from '@kbn/apm-api-shared';
import { joinByKey } from '../../../common/utils/join_by_key';
import { getApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import { getColdstartRatePeriods } from '../../lib/transaction_groups/get_coldstart_rate';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getServiceTransactionGroups } from '../services/get_service_transaction_groups';
import { getServiceTransactionGroupsAlerts } from '../services/get_service_transaction_groups_alerts';
import { getServiceTransactionGroupDetailedStatisticsPeriods } from '../services/get_service_transaction_group_detailed_statistics';
import { getTransactionBreakdown } from './breakdown';
import { getFailedTransactionRatePeriods } from './get_failed_transaction_rate_periods';
import { getLatencyPeriods } from './get_latency_charts';
import { getTraceSamples } from './trace_samples';

const transactionGroupsMainStatisticsRoute = createApmServerRoute({
  endpoint: routeDefinitions.transactions.groupsMainStatistics.endpoint,
  params: routeDefinitions.transactions.groupsMainStatistics.params,
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
  endpoint: routeDefinitions.transactions.groupsDetailedStatistics.endpoint,
  params: routeDefinitions.transactions.groupsDetailedStatistics.params,
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
  endpoint: routeDefinitions.transactions.latencyCharts.endpoint,
  params: routeDefinitions.transactions.latencyCharts.params,
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
  endpoint: routeDefinitions.transactions.traceSamples.endpoint,
  params: routeDefinitions.transactions.traceSamples.params,
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
  endpoint: routeDefinitions.transactions.chartsBreakdown.endpoint,
  params: routeDefinitions.transactions.chartsBreakdown.params,
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
  endpoint: routeDefinitions.transactions.chartsErrorRate.endpoint,
  params: routeDefinitions.transactions.chartsErrorRate.params,
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
  endpoint: routeDefinitions.transactions.chartsColdstartRate.endpoint,
  params: routeDefinitions.transactions.chartsColdstartRate.params,
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
  endpoint: routeDefinitions.transactions.chartsColdstartRateByTransactionName.endpoint,
  params: routeDefinitions.transactions.chartsColdstartRateByTransactionName.params,
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
