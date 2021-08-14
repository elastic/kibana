/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { getSearchAggregatedTransactions } from '../lib/helpers/aggregated_transactions';
import { setupRequest } from '../lib/helpers/setup_request';
import { getEnvironments } from '../lib/environments/get_environments';
import { rangeRt } from './default_api_types';
import { createApmServerRoute } from './create_apm_server_route';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';

const environmentsRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/environments',
  params: t.type({
    query: t.intersection([
      t.partial({
        serviceName: t.string,
      }),
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { serviceName } = params.query;
    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      apmEventClient: setup.apmEventClient,
      config: setup.config,
      start: setup.start,
      end: setup.end,
      kuery: '',
    });

    const environments = await getEnvironments({
      setup,
      serviceName,
      searchAggregatedTransactions,
    });

    return { environments };
  },
});

export const environmentsRouteRepository = createApmServerRouteRepository().add(
  environmentsRoute
);
