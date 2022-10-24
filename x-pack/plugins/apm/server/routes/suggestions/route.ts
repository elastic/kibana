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
      rangeRt,
      t.partial({ serviceName: t.string }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ terms: string[] }> => {
    const setup = await setupRequest(resources);
    const { context, params } = resources;
    const { fieldName, fieldValue, serviceName, start, end } = params.query;
    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient: setup.apmEventClient,
      config: setup.config,
      kuery: '',
    });
    const coreContext = await context.core;
    const size = await coreContext.uiSettings.client.get<number>(
      maxSuggestions
    );

    if (!serviceName) {
      const suggestions = await getSuggestionsWithTermsEnum({
        fieldName,
        fieldValue,
        searchAggregatedTransactions,
        setup,
        size,
        start,
        end,
      });

      if (suggestions.terms.length > 0) {
        return suggestions;
      }
    }

    return getSuggestionsWithTermsAggregation({
      fieldName,
      fieldValue,
      searchAggregatedTransactions,
      serviceName,
      setup,
      size,
      start,
      end,
    });
  },
});

export const suggestionsRouteRepository = {
  ...suggestionsRoute,
};
