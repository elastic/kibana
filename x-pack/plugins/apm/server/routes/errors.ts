/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { createRoute } from './create_route';
import { getErrorDistribution } from '../lib/errors/distribution/get_distribution';
import { getErrorGroup } from '../lib/errors/get_error_group';
import { getErrorGroups } from '../lib/errors/get_error_groups';
import { setupRequest } from '../lib/helpers/setup_request';
import { uiFiltersRt, rangeRt } from './default_api_types';

export const errorsRoute = createRoute(core => ({
  path: '/api/apm/services/{serviceName}/errors',
  params: {
    path: t.type({
      serviceName: t.string
    }),
    query: t.intersection([
      t.partial({
        sortField: t.string,
        sortDirection: t.union([t.literal('asc'), t.literal('desc')])
      }),
      uiFiltersRt,
      rangeRt
    ])
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { params } = context;
    const { serviceName } = params.path;
    const { sortField, sortDirection } = params.query;

    return getErrorGroups({
      serviceName,
      sortField,
      sortDirection,
      setup
    });
  }
}));

export const errorGroupsRoute = createRoute(() => ({
  path: '/api/apm/services/{serviceName}/errors/{groupId}',
  params: {
    path: t.type({
      serviceName: t.string,
      groupId: t.string
    }),
    query: t.intersection([uiFiltersRt, rangeRt])
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName, groupId } = context.params.path;
    return getErrorGroup({ serviceName, groupId, setup });
  }
}));

export const errorDistributionRoute = createRoute(() => ({
  path: '/api/apm/services/{serviceName}/errors/distribution',
  params: {
    path: t.type({
      serviceName: t.string
    }),
    query: t.intersection([
      t.partial({
        groupId: t.string
      }),
      uiFiltersRt,
      rangeRt
    ])
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { params } = context;
    const { serviceName } = params.path;
    const { groupId } = params.query;
    return getErrorDistribution({ serviceName, groupId, setup });
  }
}));
