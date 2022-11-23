/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { maxSuggestions } from '@kbn/observability-plugin/common';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import { getEnvironments } from './get_environments';
import { rangeRt } from '../default_api_types';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

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
      | t.Branded<string, import('@kbn/io-ts-utils').NonEmptyStringBrand>
    >;
  }> => {
    const apmEventClient = await getApmEventClient(resources);
    const { context, params, config } = resources;
    const { serviceName, start, end } = params.query;
    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config,
      start,
      end,
      kuery: '',
    });
    const coreContext = await context.core;
    const size = await coreContext.uiSettings.client.get<number>(
      maxSuggestions
    );
    const environments = await getEnvironments({
      apmEventClient,
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
