/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { maxSuggestions } from '../../../../observability/common';
import { getSearchAggregatedTransactions } from '../../lib/helpers/transactions';
import { setupRequest } from '../../lib/helpers/setup_request';
import { getEnvironments } from './get_environments';
import { rangeRt } from '../default_api_types';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';

const environmentsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/environments',
  params: t.type({
    query: t.intersection([
      t.partial({
        serviceName: t.string,
      }),
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    environments: Array<
      | 'ENVIRONMENT_NOT_DEFINED'
      | 'ENVIRONMENT_ALL'
      | t.Branded<
          string,
          import('./../../../../../../node_modules/@types/kbn__io-ts-utils/index').NonEmptyStringBrand
        >
    >;
  }> => {
    const setup = await setupRequest(resources);
    const { context, params } = resources;
    const { serviceName, start, end } = params.query;
    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      apmEventClient: setup.apmEventClient,
      config: setup.config,
      start,
      end,
      kuery: '',
    });
    const size = await context.core.uiSettings.client.get<number>(
      maxSuggestions
    );
    const environments = await getEnvironments({
      setup,
      serviceName,
      searchAggregatedTransactions,
      size,
      start,
      end,
    });

    return { environments };
  },
});

export const environmentsRouteRepository = environmentsRoute;
