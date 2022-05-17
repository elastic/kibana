/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { rangeRt } from '../default_api_types';
import { withApmSpan } from '../../utils/with_apm_span';
import { getServiceContainerMetadata } from './kubernetes_metadata/get_service_kubernetes_metadata';
import { getMetricIndices } from '../../lib/helpers/get_metric_indices';

// NOT USED ATM
const serviceContainerRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/container/{containerId}/metadata',
  params: t.type({
    path: t.type({ containerId: t.string }),
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const { context, params, plugins } = resources;
    const { containerId } = params.path;
    const { start, end } = params.query;

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const savedObjectsClient = (await context.core).savedObjects.client;

    const metricIndices = await getMetricIndices({
      infraPlugin: plugins.infra,
      savedObjectsClient,
    });

    return withApmSpan(
      'get_service_kubernetes_metadata',
      async () =>
        await getServiceContainerMetadata({
          esClient,
          index: metricIndices,
          containerId,
          start,
          end,
        })
    );
  },
});

export const serviceContainerRouteRepository = serviceContainerRoute;
