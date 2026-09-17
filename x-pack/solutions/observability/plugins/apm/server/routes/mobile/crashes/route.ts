/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  routeDefinitions,
  type CrashDistributionResponse,
  type CrashMainStatisticsRouteResponse,
  type MobileCrashesGroupPeriodsResponse,
} from '@kbn/apm-api-shared';
import { getApmEventClient } from '../../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import { getMobileCrashGroupMainStatistics } from './get_crash_groups/get_crash_group_main_statistics';
import { getMobileCrashesGroupPeriods } from './get_mobile_crash_group_detailed_statistics';
import { getCrashDistribution } from './distribution/get_distribution';

const mobileCrashDistributionRoute = createApmServerRoute({
  endpoint: routeDefinitions.mobileCrashes.distribution.endpoint,
  params: routeDefinitions.mobileCrashes.distribution.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<CrashDistributionResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { environment, kuery, groupId, start, end, offset } = params.query;
    return getCrashDistribution({
      environment,
      kuery,
      serviceName,
      groupId,
      apmEventClient,
      start,
      end,
      offset,
    });
  },
});

const mobileCrashMainStatisticsRoute = createApmServerRoute({
  endpoint: routeDefinitions.mobileCrashes.mainStatistics.endpoint,
  params: routeDefinitions.mobileCrashes.mainStatistics.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<CrashMainStatisticsRouteResponse> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const { serviceName } = params.path;
    const { environment, kuery, sortField, sortDirection, start, end } = params.query;

    const errorGroups = await getMobileCrashGroupMainStatistics({
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

const mobileCrashDetailedStatisticsRoute = createApmServerRoute({
  endpoint: routeDefinitions.mobileCrashes.detailedStatistics.endpoint,
  params: routeDefinitions.mobileCrashes.detailedStatistics.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<MobileCrashesGroupPeriodsResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;

    const {
      path: { serviceName },
      query: { environment, kuery, numBuckets, start, end, offset },
      body: { groupIds },
    } = params;

    return getMobileCrashesGroupPeriods({
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

export const mobileCrashRoutes = {
  ...mobileCrashDetailedStatisticsRoute,
  ...mobileCrashMainStatisticsRoute,
  ...mobileCrashDistributionRoute,
};
