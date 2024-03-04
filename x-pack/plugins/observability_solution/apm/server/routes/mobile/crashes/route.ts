/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { jsonRt, toNumberRt } from '@kbn/io-ts-utils';
import { getApmEventClient } from '../../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt, rangeRt } from '../../default_api_types';
import { offsetRt } from '../../../../common/comparison_rt';
import {
  getMobileCrashGroupMainStatistics,
  MobileCrashGroupMainStatisticsResponse,
} from './get_crash_groups/get_crash_group_main_statistics';
import {
  MobileCrashesGroupPeriodsResponse,
  getMobileCrashesGroupPeriods,
} from './get_mobile_crash_group_detailed_statistics';
import {
  CrashDistributionResponse,
  getCrashDistribution,
} from './distribution/get_distribution';

const mobileCrashDistributionRoute = createApmServerRoute({
  endpoint:
    'GET /internal/apm/mobile-services/{serviceName}/crashes/distribution',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.partial({
        groupId: t.string,
      }),
      environmentRt,
      kueryRt,
      rangeRt,
      offsetRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
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
  endpoint:
    'GET /internal/apm/mobile-services/{serviceName}/crashes/groups/main_statistics',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.partial({
        sortField: t.string,
        sortDirection: t.union([t.literal('asc'), t.literal('desc')]),
      }),
      environmentRt,
      kueryRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{ errorGroups: MobileCrashGroupMainStatisticsResponse }> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const { serviceName } = params.path;
    const { environment, kuery, sortField, sortDirection, start, end } =
      params.query;

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
  endpoint:
    'POST /internal/apm/mobile-services/{serviceName}/crashes/groups/detailed_statistics',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      environmentRt,
      kueryRt,
      rangeRt,
      offsetRt,
      t.type({
        numBuckets: toNumberRt,
      }),
    ]),
    body: t.type({ groupIds: jsonRt.pipe(t.array(t.string)) }),
  }),
  options: { tags: ['access:apm'] },
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
