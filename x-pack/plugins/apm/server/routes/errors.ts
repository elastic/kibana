/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createRoute } from './create_route';
import { getErrorDistribution } from '../lib/errors/distribution/get_distribution';
import { getErrorGroupSample } from '../lib/errors/get_error_group_sample';
import { getErrorGroups } from '../lib/errors/get_error_groups';
import { setupRequest } from '../lib/helpers/setup_request';
import { environmentRt, uiFiltersRt, rangeRt } from './default_api_types';

export const errorsRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/errors',
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
      uiFiltersRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { params } = context;
    const { serviceName } = params.path;
    const { environment, sortField, sortDirection } = params.query;

    return getErrorGroups({
      environment,
      serviceName,
      sortField,
      sortDirection,
      setup,
    });
  },
});

export const errorGroupsRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/errors/{groupId}',
  params: t.type({
    path: t.type({
      serviceName: t.string,
      groupId: t.string,
    }),
    query: t.intersection([environmentRt, uiFiltersRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName, groupId } = context.params.path;
    const { environment } = context.params.query;

    return getErrorGroupSample({ environment, serviceName, groupId, setup });
  },
});

export const errorDistributionRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/errors/distribution',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.partial({
        groupId: t.string,
      }),
      environmentRt,
      uiFiltersRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { params } = context;
    const { serviceName } = params.path;
    const { environment, groupId } = params.query;
    return getErrorDistribution({ environment, serviceName, groupId, setup });
  },
});
