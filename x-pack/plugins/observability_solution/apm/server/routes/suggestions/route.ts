/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { maxSuggestions } from '@kbn/observability-plugin/common';
import { getSuggestionsWithTermsEnum } from './get_suggestions_with_terms_enum';
import { getSuggestionsWithTermsAggregation } from './get_suggestions_with_terms_aggregation';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { rangeRt } from '../default_api_types';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

const suggestionsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/suggestions',
  params: t.type({
    query: t.intersection([
      t.type({
        fieldName: t.string,
        fieldValue: t.string,
      }),
      rangeRt,
      t.partial({ serviceName: t.string }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ terms: string[] }> => {
    const apmEventClient = await getApmEventClient(resources);
    const { context, params, config } = resources;
    const { fieldName, fieldValue, serviceName, start, end } = params.query;
    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config,
      kuery: '',
    });
    const coreContext = await context.core;
    const size = await coreContext.uiSettings.client.get<number>(maxSuggestions);

    if (!serviceName) {
      const suggestions = await getSuggestionsWithTermsEnum({
        fieldName,
        fieldValue,
        searchAggregatedTransactions,
        apmEventClient,
        size,
        start,
        end,
      });

      // if no terms are found using terms enum it will fall back to using ordinary terms agg search
      // This is useful because terms enum can only find terms that start with the search query
      // whereas terms agg approach can find terms that contain the search query
      if (suggestions.terms.length > 0) {
        return suggestions;
      }
    }

    return getSuggestionsWithTermsAggregation({
      fieldName,
      fieldValue,
      searchAggregatedTransactions,
      serviceName,
      apmEventClient,
      size,
      start,
      end,
    });
  },
});

export const suggestionsRouteRepository = {
  ...suggestionsRoute,
};
