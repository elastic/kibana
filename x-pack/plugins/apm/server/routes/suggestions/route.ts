/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { maxSuggestions } from '@kbn/observability-plugin/common';
import { getSuggestions } from './get_suggestions';
import { getSearchAggregatedTransactions } from '../../lib/helpers/transactions';
import { setupRequest } from '../../lib/helpers/setup_request';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';

const suggestionsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/suggestions',
  params: t.partial({
    query: t.type({ field: t.string, string: t.string }),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ terms: string[] }> => {
    const setup = await setupRequest(resources);
    const { context, params } = resources;
    const { field, string } = params.query;
    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      apmEventClient: setup.apmEventClient,
      config: setup.config,
      kuery: '',
    });
    const size = await context.core.uiSettings.client.get<number>(
      maxSuggestions
    );
    const suggestions = await getSuggestions({
      field,
      searchAggregatedTransactions,
      setup,
      size,
      string,
    });

    return suggestions;
  },
});

export const suggestionsRouteRepository = suggestionsRoute;
