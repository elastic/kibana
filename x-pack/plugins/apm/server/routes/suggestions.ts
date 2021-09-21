/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { getEnvironmentSuggestions } from '../lib/environments/get_environment_suggestions';
import { getSearchAggregatedTransactions } from '../lib/helpers/aggregated_transactions';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceNameSuggestions } from '../lib/services/get_service_name_suggestions';
import { getTransactionTypeSuggestions } from '../lib/transactions/get_transaction_type_suggestions';
import { createApmServerRoute } from './create_apm_server_route';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';

const environmentSuggestionsRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/suggestions/environments',
  params: t.partial({
    query: t.type({ string: t.string }),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { string } = params.query;
    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      apmEventClient: setup.apmEventClient,
      config: setup.config,
      kuery: '',
    });

    const environments = await getEnvironmentSuggestions({
      searchAggregatedTransactions,
      setup,
      string,
    });

    return environments;
  },
});

const serviceNameSuggestionsRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/suggestions/service_names',
  params: t.partial({
    query: t.type({ string: t.string }),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { string } = params.query;
    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      apmEventClient: setup.apmEventClient,
      config: setup.config,
      kuery: '',
    });

    const serviceNames = await getServiceNameSuggestions({
      searchAggregatedTransactions,
      setup,
      string,
    });

    return serviceNames;
  },
});

const transactionTypeSuggestionsRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/suggestions/transaction_types',
  params: t.partial({
    query: t.type({ string: t.string }),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { string } = params.query;
    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      apmEventClient: setup.apmEventClient,
      config: setup.config,
      kuery: '',
    });

    const transactionTypes = await getTransactionTypeSuggestions({
      searchAggregatedTransactions,
      setup,
      string,
    });

    return transactionTypes;
  },
});

export const suggestionsRouteRepository = createApmServerRouteRepository()
  .add(environmentSuggestionsRoute)
  .add(serviceNameSuggestionsRoute)
  .add(transactionTypeSuggestionsRoute);
