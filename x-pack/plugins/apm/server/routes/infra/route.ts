/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { SavedObjectsClientContract } from '@kbn/core/server';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
// import { kueryRt, rangeRt } from '../default_api_types';
import { APMRouteHandlerResources } from '../../routes/typings';
import { withApmSpan } from '../../utils/with_apm_span';
import { getServiceContainerMetadata } from './container_metadata/get_service_container_metadata';

async function getMetricIndices(
  infraPlugin: Required<APMRouteHandlerResources['plugins']>['infra'],
  savedObjectsClient: SavedObjectsClientContract
): Promise<string> {
  const infra = await infraPlugin.start();
  const metricIndices = await infra.getMetricIndices(savedObjectsClient);

  return metricIndices;
}

const serviceContainerRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/container/metadata',
  params: t.type({
    query: t.type({
      containerId: t.string,
    }),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const { context, params, plugins } = resources;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const savedObjectsClient = (await context.core).savedObjects.client;

    const metricIndices = await getMetricIndices(
      plugins.infra,
      savedObjectsClient
    );

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
