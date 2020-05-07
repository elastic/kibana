/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { createRoute } from './create_route';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceNodes } from '../lib/service_nodes';
import { rangeRt, uiFiltersRt } from './default_api_types';

export const serviceNodesRoute = createRoute(core => ({
  path: '/api/apm/services/{serviceName}/serviceNodes',
  params: {
    path: t.type({
      serviceName: t.string
    }),
    query: t.intersection([rangeRt, uiFiltersRt])
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { params } = context;
    const { serviceName } = params.path;

    return getServiceNodes({
      setup,
      serviceName
    });
  }
}));
