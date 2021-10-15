/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { setupRequest } from '../lib/helpers/setup_request';
import { fetchTransactionDurationFieldCandidates } from '../lib/search_strategies/queries/query_field_candidates';
import { withApmSpan } from '../utils/with_apm_span';

import { createApmServerRoute } from './create_apm_server_route';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';
import { environmentRt, kueryRt, rangeRt } from './default_api_types';

const params = t.type({
  query: t.intersection([
    t.partial({
      serviceName: t.string,
      transactionName: t.string,
      transactionType: t.string,
    }),
    environmentRt,
    kueryRt,
    rangeRt,
  ]),
});

const fieldCandidatesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/correlations/field_candidates',
  params,
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const { indices } = await setupRequest(resources);
    const esClient = resources.context.core.elasticsearch.client.asCurrentUser;

    return withApmSpan(
      'get_correlations_field_candidates',
      async () =>
        await fetchTransactionDurationFieldCandidates(esClient, {
          ...resources.params.query,
          index: indices.transaction,
        })
    );
  },
});

export const correlationsRouteRepository =
  createApmServerRouteRepository().add(fieldCandidatesRoute);
