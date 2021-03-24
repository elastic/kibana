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
import { createRoute } from './create_route';
import { rangeRt } from './default_api_types';

export const environmentsRoute = createRoute({
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
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.query;
    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getEnvironments({
      setup,
      serviceName,
      searchAggregatedTransactions,
    });
  },
});
