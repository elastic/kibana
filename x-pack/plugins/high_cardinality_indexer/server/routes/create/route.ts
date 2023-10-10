/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { toBooleanRt } from '@kbn/io-ts-utils';
import { createHighCardinalityIndexerServerRoute } from '../create_high_cardinality_indexer_server_route';

const createRoute = createHighCardinalityIndexerServerRoute({
  endpoint: 'POST /internal/high_cardinality_indexer/create',
  options: {},
  params: t.intersection([
    t.type({
      body: t.intersection([
        t.type({
          messages: t.array(t.string),
          connectorId: t.string,
          functions: t.array(
            t.type({
              name: t.string,
              description: t.string,
              parameters: t.any,
            })
          ),
        }),
        t.partial({
          functionCall: t.string,
        }),
      ]),
    }),
    t.partial({ query: t.type({ stream: toBooleanRt }) }),
  ]),
  handler: async (resources): Promise<{ success: boolean }> => {
    const { request, params } = resources;

    const {
      body: {},
    } = params;

    // Create thing

    return { success: true };
  },
});

export const createRoutes = {
  ...createRoute,
};
