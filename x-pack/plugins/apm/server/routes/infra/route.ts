/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
// import { kueryRt, rangeRt } from '../default_api_types';
import { setupRequest } from '../../lib/helpers/setup_request';
import { withApmSpan } from '../../utils/with_apm_span';
import { getServiceContainerMetadata } from './container_metadata/get_service_container_metadata';

const serviceContainerRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/container/metadata',
  params: t.type({
    query: t.type({
      containerId: t.string,
    }),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const { context, params } = resources;
    const { metricIndices } = await setupRequest(resources);
    console.log('metricIndices: ', metricIndices);
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;

    return withApmSpan(
      'get_service_container_metadata',
      async () =>
        await getServiceContainerMetadata({
          esClient,
          containerId: params.query.containerId,
          index: metricIndices,
        })
    );
  },
});

export const serviceContainerRouteRepository = serviceContainerRoute;
