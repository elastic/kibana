/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  routeDefinitions,
  type MobileFiltersRouteResponse,
  type MobileMostUsedChartsRouteResponse,
  type MobilePeriodStats,
  type MobileLocationStats,
  type SessionsTimeseries,
  type HttpRequestsTimeseries,
  type MobileTermsByFieldRouteResponse,
  type MobileMainStatisticsResponse,
  type MobileDetailedStatisticsResponse,
} from '@kbn/apm-api-shared';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getMobileHttpRequests } from './get_mobile_http_requests';
import { getMobileFilters } from './get_mobile_filters';
import { getMobileSessions } from './get_mobile_sessions';
import { getMobileStatsPeriods } from './get_mobile_stats';
import { getMobileLocationStatsPeriods } from './get_mobile_location_stats';
import { getMobileTermsByField } from './get_mobile_terms_by_field';
import { getMobileMainStatisticsByField } from './get_mobile_main_statistics_by_field';
import { getMobileDetailedStatisticsByFieldPeriods } from './get_mobile_detailed_statistics_by_field';
import { getMobileMostUsedCharts } from './get_mobile_most_used_charts';
import { mobileErrorRoutes } from './errors/route';
import { mobileCrashRoutes } from './crashes/route';

const mobileFiltersRoute = createApmServerRoute({
  endpoint: routeDefinitions.mobile.filters.endpoint,
  params: routeDefinitions.mobile.filters.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<MobileFiltersRouteResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { kuery, environment, start, end, transactionType } = params.query;

    const filters = await getMobileFilters({
      kuery,
      environment,
      transactionType,
      start,
      end,
      serviceName,
      apmEventClient,
    });
    return { mobileFilters: filters };
  },
});

const mobileChartsRoute = createApmServerRoute({
  endpoint: routeDefinitions.mobile.mostUsedCharts.endpoint,
  params: routeDefinitions.mobile.mostUsedCharts.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<MobileMostUsedChartsRouteResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { kuery, environment, start, end, transactionType } = params.query;

    const mostUsedCharts = await getMobileMostUsedCharts({
      kuery,
      environment,
      transactionType,
      start,
      end,
      serviceName,
      apmEventClient,
    });

    return { mostUsedCharts };
  },
});

const mobileStatsRoute = createApmServerRoute({
  endpoint: routeDefinitions.mobile.stats.endpoint,
  params: routeDefinitions.mobile.stats.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<MobilePeriodStats> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { kuery, environment, start, end, offset } = params.query;

    const stats = await getMobileStatsPeriods({
      kuery,
      environment,
      start,
      end,
      serviceName,
      apmEventClient,
      offset,
    });

    return stats;
  },
});

const mobileLocationStatsRoute = createApmServerRoute({
  endpoint: routeDefinitions.mobile.locationStats.endpoint,
  params: routeDefinitions.mobile.locationStats.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<MobileLocationStats> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { kuery, environment, start, end, locationField, offset } = params.query;

    const locationStats = await getMobileLocationStatsPeriods({
      kuery,
      environment,
      start,
      end,
      serviceName,
      apmEventClient,
      locationField,
      offset,
    });

    return locationStats;
  },
});

const sessionsChartRoute = createApmServerRoute({
  endpoint: routeDefinitions.mobile.sessions.endpoint,
  params: routeDefinitions.mobile.sessions.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<SessionsTimeseries> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { kuery, environment, start, end, transactionName, offset } = params.query;

    const { currentPeriod, previousPeriod } = await getMobileSessions({
      kuery,
      environment,
      transactionName,
      start,
      end,
      serviceName,
      apmEventClient,
      offset,
    });

    return { currentPeriod, previousPeriod };
  },
});

const httpRequestsChartRoute = createApmServerRoute({
  endpoint: routeDefinitions.mobile.httpRequests.endpoint,
  params: routeDefinitions.mobile.httpRequests.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<HttpRequestsTimeseries> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { kuery, environment, start, end, transactionName, offset } = params.query;

    const { currentPeriod, previousPeriod } = await getMobileHttpRequests({
      kuery,
      environment,
      transactionName,
      start,
      end,
      serviceName,
      apmEventClient,
      offset,
    });

    return { currentPeriod, previousPeriod };
  },
});

const mobileTermsByFieldRoute = createApmServerRoute({
  endpoint: routeDefinitions.mobile.termsByField.endpoint,
  params: routeDefinitions.mobile.termsByField.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<MobileTermsByFieldRouteResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { kuery, environment, start, end, size, fieldName } = params.query;
    const terms = await getMobileTermsByField({
      kuery,
      environment,
      start,
      end,
      serviceName,
      apmEventClient,
      fieldName,
      size,
    });

    return { terms };
  },
});

const mobileMainStatisticsByField = createApmServerRoute({
  endpoint: routeDefinitions.mobile.mainStatistics.endpoint,
  params: routeDefinitions.mobile.mainStatistics.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<MobileMainStatisticsResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { kuery, environment, start, end, field } = params.query;

    return await getMobileMainStatisticsByField({
      kuery,
      environment,
      start,
      end,
      serviceName,
      apmEventClient,
      field,
    });
  },
});

const mobileDetailedStatisticsByField = createApmServerRoute({
  endpoint: routeDefinitions.mobile.detailedStatistics.endpoint,
  params: routeDefinitions.mobile.detailedStatistics.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<MobileDetailedStatisticsResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { kuery, environment, start, end, field, offset, fieldValues } = params.query;

    return await getMobileDetailedStatisticsByFieldPeriods({
      kuery,
      environment,
      start,
      end,
      serviceName,
      apmEventClient,
      field,
      fieldValues,
      offset,
    });
  },
});

export const mobileRouteRepository = {
  ...mobileErrorRoutes,
  ...mobileCrashRoutes,
  ...mobileFiltersRoute,
  ...mobileChartsRoute,
  ...sessionsChartRoute,
  ...httpRequestsChartRoute,
  ...mobileStatsRoute,
  ...mobileLocationStatsRoute,
  ...mobileTermsByFieldRoute,
  ...mobileMainStatisticsByField,
  ...mobileDetailedStatisticsByField,
};
