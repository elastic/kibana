/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getErrorDistribution } from './distribution/get_distribution';
import { getErrorGroupSample } from './get_error_group_sample';
import { getErrorGroups } from './get_error_groups';
import { setupRequest } from '../../lib/helpers/setup_request';
import {
  environmentRt,
  kueryRt,
  rangeRt,
  comparisonRangeRt,
} from '../default_api_types';
import { createApmServerRouteRepository } from '../apm_routes/create_apm_server_route_repository';

const errorsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/errors',
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
  handler: async (resources) => {
    const { params } = resources;
    const setup = await setupRequest(resources);
    const { serviceName } = params.path;
    const { environment, kuery, sortField, sortDirection, start, end } =
      params.query;

    const errorGroups = await getErrorGroups({
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
  handler: async (resources) => {
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
  handler: async (resources) => {
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

export const errorsRouteRepository = createApmServerRouteRepository()
  .add(errorsRoute)
  .add(errorGroupsRoute)
  .add(errorDistributionRoute);
