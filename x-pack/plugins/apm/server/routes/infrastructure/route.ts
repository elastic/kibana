/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { jsonRt } from '@kbn/io-ts-utils';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { setupRequest } from '../../lib/helpers/setup_request';
import { environmentRt, kueryRt, rangeRt } from '../default_api_types';
import { getInfrastructureData } from './get_infrastructure_data';
import { getMetricIndices } from '../../lib/helpers/get_metric_indices';
import { withApmSpan } from '../../utils/with_apm_span';
import { getHostNames } from './get_host_names';

const infrastructureRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/infra',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([kueryRt, rangeRt, environmentRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    infrastructureData: {
      containerIds: string[];
      hostNames: string[];
      podNames: string[];
    };
  }> => {
    const setup = await setupRequest(resources);

    const { params } = resources;

    const {
      path: { serviceName },
      query: { environment, kuery, start, end },
    } = params;

    const infrastructureData = await getInfrastructureData({
      setup,
      serviceName,
      environment,
      kuery,
      start,
      end,
    });
    return { infrastructureData };
  },
});

const serviceHostNamesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/container/host_names',
  params: t.type({
    query: t.intersection([
      t.type({
        containerIds: jsonRt.pipe(t.array(t.string)),
      }),
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ hostNames: string[] }> => {
    const { context, params, plugins } = resources;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const savedObjectsClient = (await context.core).savedObjects.client;
    const metricIndices = await getMetricIndices({
      infraPlugin: plugins.infra,
      savedObjectsClient,
    });

    const {
      query: { start, end },
    } = params;

    return withApmSpan(
      'get_service_container_host_names',
      async (): Promise<{ hostNames: string[] }> =>
        await getHostNames({
          esClient,
          containerIds: params.query.containerIds,
          index: metricIndices,
          start,
          end,
        })
    );
  },
});

export const infrastructureRouteRepository = {
  ...infrastructureRoute,
  ...serviceHostNamesRoute,
};
