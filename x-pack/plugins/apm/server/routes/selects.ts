/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { getAllEnvironments } from '../lib/environments/get_all_environments';
import { getSearchAggregatedTransactions } from '../lib/helpers/aggregated_transactions';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceNames } from '../lib/settings/agent_configuration/get_service_names';
import { createApmServerRoute } from './create_apm_server_route';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';

const environmentsSelectRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/select/environments',
  params: t.partial({
    query: t.partial({ serviceName: t.string }),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;

    const { serviceName } = params.query;
    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      apmEventClient: setup.apmEventClient,
      config: setup.config,
      kuery: '',
    });

    const environments = await getAllEnvironments({
      serviceName,
      setup,
      searchAggregatedTransactions,
    });

    return { environments };
  },
});

const servicesSelectRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/select/services',
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      apmEventClient: setup.apmEventClient,
      config: setup.config,
      kuery: '',
    });
    const serviceNames = await getServiceNames({
      setup,
      searchAggregatedTransactions,
    });

    return { serviceNames };
  },
});

export const selectsRouteRepository = createApmServerRouteRepository()
  .add(environmentsSelectRoute)
  .add(servicesSelectRoute);
