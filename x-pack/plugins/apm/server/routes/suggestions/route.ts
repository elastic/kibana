/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { maxSuggestions } from '../../../../observability/common';
import { getSuggestions } from '../suggestions/get_suggestions';
import { getSuggestionsByServiceName } from '../suggestions/get_suggestions_by_service_name';
import { getSearchAggregatedTransactions } from '../../lib/helpers/transactions';
import { setupRequest } from '../../lib/helpers/setup_request';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { rangeRt } from '../default_api_types';

const suggestionsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/suggestions',
  params: t.type({
    query: t.intersection([
      t.type({
        fieldName: t.string,
        fieldValue: t.string,
      }),
      t.partial(rangeRt.props),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ terms: string[] }> => {
    const setup = await setupRequest(resources);
    const { context, params } = resources;
    const { fieldName, fieldValue, start, end } = params.query;
    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      apmEventClient: setup.apmEventClient,
      config: setup.config,
      kuery: '',
    });
    const size = await context.core.uiSettings.client.get<number>(
      maxSuggestions
    );

    const suggestions = await getSuggestions({
      fieldName,
      fieldValue,
      searchAggregatedTransactions,
      setup,
      size,
      start,
      end,
    });

    return suggestions;
  },
});

const suggestionsWithTermsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/suggestions_by_service_name',
  params: t.type({
    query: t.intersection([
      t.type({
        fieldName: t.string,
        fieldValue: t.string,
        serviceName: t.string,
      }),
      t.partial(rangeRt.props),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ terms: string[] }> => {
    const setup = await setupRequest(resources);
    const { context, params } = resources;
    const { fieldName, fieldValue, serviceName, start, end } = params.query;

    const size = await context.core.uiSettings.client.get<number>(
      maxSuggestions
    );

    const suggestions = await getSuggestionsByServiceName({
      fieldName,
      fieldValue,
      serviceName,
      setup,
      size,
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
