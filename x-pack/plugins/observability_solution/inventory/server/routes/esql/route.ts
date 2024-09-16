/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQLSearchResponse } from '@kbn/es-types';
import { createObservabilityEsClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import * as t from 'io-ts';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getEsqlRequest } from '../../../common/utils/get_esql_request';
import { createInventoryServerRoute } from '../create_inventory_server_route';

const queryEsqlRoute = createInventoryServerRoute({
  endpoint: 'POST /internal/inventory/esql',
  params: t.type({
    body: t.intersection([
      t.type({
        query: t.string,
        kuery: t.string,
        operationName: t.string,
      }),
      t.partial({
        start: t.number,
        end: t.number,
        timestampField: t.string,
        dslFilter: t.array(t.record(t.string, t.any)),
      }),
    ]),
  }),
  options: {
    tags: ['access:inventory'],
  },
  handler: async ({ context, logger, params }): Promise<ESQLSearchResponse> => {
    const esClient = createObservabilityEsClient({
      client: (await context.core).elasticsearch.client.asCurrentUser,
      logger,
      plugin: 'inventory',
    });

    const {
      body: { query, kuery, start, end, dslFilter, timestampField, operationName },
    } = params;

    const request = getEsqlRequest({
      query,
      start,
      end,
      timestampField,
      kuery,
      dslFilter: dslFilter as QueryDslQueryContainer[],
    });

    return await esClient.esql(operationName, request);
  },
});

export const esqlRoutes = {
  ...queryEsqlRoute,
};
