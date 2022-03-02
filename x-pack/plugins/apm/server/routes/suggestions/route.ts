/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { maxSuggestions } from '../../../../observability/common';
import { getSuggestions } from '../suggestions/get_suggestions';
import { getSuggestionsWithTerm } from '../suggestions/get_suggestions_with_term';
import { getSearchAggregatedTransactions } from '../../lib/helpers/transactions';
import { setupRequest } from '../../lib/helpers/setup_request';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { rangeRt } from '../default_api_types';

const suggestionsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/suggestions',
  params: t.type({
    query: t.intersection([
      t.type({
        field: t.string,
        string: t.string,
      }),
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ terms: string[] }> => {
    const setup = await setupRequest(resources);
    const { context, params } = resources;
    const { field, string, start, end } = params.query;
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
      start,
      end,
    });

    return suggestions;
  },
});

const suggestionsWithTermsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/suggestions_with_terms',
  params: t.type({
    query: t.intersection([
      t.type({
        field: t.string,
        string: t.string,
        termField: t.string,
        termValue: t.string,
      }),
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ terms: string[] }> => {
    const setup = await setupRequest(resources);
    const { context, params } = resources;
    const { field, string, termField, termValue, start, end } = params.query;

    const size = await context.core.uiSettings.client.get<number>(
      maxSuggestions
    );

    const filter = [{ term: { [termField]: termValue } }];

    const suggestions = await getSuggestionsWithTerm({
      field,
      filter,
      setup,
      size,
      string,
      start,
      end,
    });

    return suggestions;
  },
});

export const suggestionsRouteRepository = {
  ...suggestionsRoute,
  ...suggestionsWithTermsRoute,
};
