/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { jsonRt, toNumberRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getErrorDistribution } from './distribution/get_distribution';
import { setupRequest } from '../../lib/helpers/setup_request';
import {
  environmentRt,
  kueryRt,
  rangeRt,
  comparisonRangeRt,
} from '../default_api_types';
import { getErrorGroupMainStatistics } from './get_error_groups/get_error_group_main_statistics';
import { getErrorGroupPeriods } from './get_error_groups/get_error_group_detailed_statistics';
import { getErrorGroupSample } from './get_error_groups/get_error_group_sample';

const errorsMainStatisticsRoute = createApmServerRoute({
  endpoint:
    'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics',
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
  ): Promise<{
    errorGroups: Array<{
      groupId: string;
      name: string;
      lastSeen: number;
      occurrences: number;
      culprit: string | undefined;
      handled: boolean | undefined;
      type: string | undefined;
    }>;
  }> => {
    const { params } = resources;
    const setup = await setupRequest(resources);
    const { serviceName } = params.path;
    const { environment, kuery, sortField, sortDirection, start, end } =
      params.query;

    const errorGroups = await getErrorGroupMainStatistics({
      environment,
      kuery,
      serviceName,
      sortField,
      sortDirection,
      setup,
      start,
      end,
    });

    return { errorGroups };
  },
});

const errorsDetailedStatisticsRoute = createApmServerRoute({
  endpoint:
    'GET /internal/apm/services/{serviceName}/errors/groups/detailed_statistics',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      environmentRt,
      kueryRt,
      rangeRt,
      comparisonRangeRt,
      t.type({
        numBuckets: toNumberRt,
        groupIds: jsonRt.pipe(t.array(t.string)),
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    currentPeriod: import('./../../../../../../node_modules/@types/lodash/ts3.1/index').Dictionary<{
      groupId: string;
      timeseries: Array<import('./../../../typings/timeseries').Coordinate>;
    }>;
    previousPeriod: import('./../../../../../../node_modules/@types/lodash/ts3.1/index').Dictionary<{
      timeseries: Array<{
        x: number;
        y: import('./../../../typings/common').Maybe<number>;
      }>;
      groupId: string;
    }>;
  }> => {
    const setup = await setupRequest(resources);
    const { params } = resources;

    const {
      path: { serviceName },
      query: {
        environment,
        kuery,
        numBuckets,
        groupIds,
        comparisonStart,
        comparisonEnd,
        start,
        end,
      },
    } = params;

    return getErrorGroupPeriods({
      environment,
      kuery,
      serviceName,
      setup,
      numBuckets,
      groupIds,
      comparisonStart,
      comparisonEnd,
      start,
      end,
    });
  },
});

const errorGroupsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/errors/{groupId}',
  params: t.type({
    path: t.type({
      serviceName: t.string,
      groupId: t.string,
    }),
    query: t.intersection([environmentRt, kueryRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    transaction:
      | import('./../../../typings/es_schemas/ui/transaction').Transaction
      | undefined;
    error: import('./../../../typings/es_schemas/ui/apm_error').APMError;
    occurrencesCount: number;
  }> => {
    const { params } = resources;
    const setup = await setupRequest(resources);
    const { serviceName, groupId } = params.path;
    const { environment, kuery, start, end } = params.query;

    return getErrorGroupSample({
      environment,
      groupId,
      kuery,
      serviceName,
      setup,
      start,
      end,
    });
  },
});

const errorDistributionRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/errors/distribution',
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
      comparisonRangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    currentPeriod: Array<{ x: number; y: number }>;
    previousPeriod: Array<{
      x: number;
      y: import('./../../../typings/common').Maybe<number>;
    }>;
    bucketSize: number;
  }> => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      groupId,
      start,
      end,
      comparisonStart,
      comparisonEnd,
    } = params.query;
    return getErrorDistribution({
      environment,
      kuery,
      serviceName,
      groupId,
      setup,
      start,
      end,
      comparisonStart,
      comparisonEnd,
    });
  },
});

export const errorsRouteRepository = {
  ...errorsMainStatisticsRoute,
  ...errorsDetailedStatisticsRoute,
  ...errorGroupsRoute,
  ...errorDistributionRoute,
};
