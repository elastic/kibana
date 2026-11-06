/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  routeDefinitions,
  type MobileHttpErrorsTimeseries,
  type MobileErrorGroupPeriodsResponse,
  type MobileErrorTermsRouteResponse,
  type MobileErrorsMainStatisticsRouteResponse,
} from '@kbn/apm-api-shared';
import { getApmEventClient } from '../../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import { getMobileHttpErrors } from './get_mobile_http_errors';
import { getMobileErrorGroupPeriods } from './get_mobile_error_group_detailed_statistics';
import { getMobileErrorsTermsByField } from './get_mobile_errors_terms_by_field';
import { getMobileErrorGroupMainStatistics } from './get_mobile_error_group_main_statistics';

const mobileMobileHttpRatesRoute = createApmServerRoute({
  endpoint: routeDefinitions.mobileErrors.httpErrorRate.endpoint,
  params: routeDefinitions.mobileErrors.httpErrorRate.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<MobileHttpErrorsTimeseries> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { kuery, environment, start, end, offset } = params.query;
    const response = await getMobileHttpErrors({
      kuery,
      environment,
      start,
      end,
      serviceName,
      apmEventClient,
      offset,
    });

    return { ...response };
  },
});

const mobileErrorsDetailedStatisticsRoute = createApmServerRoute({
  endpoint: routeDefinitions.mobileErrors.detailedStatistics.endpoint,
  params: routeDefinitions.mobileErrors.detailedStatistics.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<MobileErrorGroupPeriodsResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;

    const {
      path: { serviceName },
      query: { environment, kuery, numBuckets, start, end, offset },
      body: { groupIds },
    } = params;

    return getMobileErrorGroupPeriods({
      environment,
      kuery,
      serviceName,
      apmEventClient,
      numBuckets,
      groupIds,
      start,
      end,
      offset,
    });
  },
});

const mobileErrorTermsByFieldRoute = createApmServerRoute({
  endpoint: routeDefinitions.mobileErrors.errorTerms.endpoint,
  params: routeDefinitions.mobileErrors.errorTerms.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<MobileErrorTermsRouteResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { kuery, environment, start, end, size, fieldName } = params.query;
    const terms = await getMobileErrorsTermsByField({
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

const mobileErrorsMainStatisticsRoute = createApmServerRoute({
  endpoint: routeDefinitions.mobileErrors.mainStatistics.endpoint,
  params: routeDefinitions.mobileErrors.mainStatistics.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<MobileErrorsMainStatisticsRouteResponse> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const { serviceName } = params.path;
    const { environment, kuery, sortField, sortDirection, start, end } = params.query;

    const errorGroups = await getMobileErrorGroupMainStatistics({
      environment,
      kuery,
      serviceName,
      sortField,
      sortDirection,
      apmEventClient,
      start,
      end,
    });

    return { errorGroups };
  },
});

export const mobileErrorRoutes = {
  ...mobileMobileHttpRatesRoute,
  ...mobileErrorsMainStatisticsRoute,
  ...mobileErrorsDetailedStatisticsRoute,
  ...mobileErrorTermsByFieldRoute,
};
