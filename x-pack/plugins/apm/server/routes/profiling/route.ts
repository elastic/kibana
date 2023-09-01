/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { ElasticFlameGraph } from '@kbn/profiling-data-access-plugin/common/flamegraph';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt, rangeRt } from '../default_api_types';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getServiceHostNames } from './get_service_host_names';
import { hostNamesToKuery } from './utils';

const profilingFlamegraphRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/profiling/flamegraph',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([rangeRt, kueryRt, environmentRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<ElasticFlameGraph> => {
    const { context, plugins, params } = resources;
    const [esClient, apmEventClient, profilingDataAccessStart] =
      await Promise.all([
        (await context.core).elasticsearch.client,
        await getApmEventClient(resources),
        await plugins.profilingDataAccess.start(),
      ]);

    const { start, end, kuery, environment } = params.query;
    const { serviceName } = params.path;

    const serviceHostNames = await getServiceHostNames({
      apmEventClient,
      start,
      end,
      kuery,
      environment,
      serviceName,
    });

    const flamegraph =
      await profilingDataAccessStart.services.fetchFlamechartData({
        esClient: esClient.asCurrentUser,
        rangeFrom: start / 1000,
        rangeTo: end / 1000,
        kuery: hostNamesToKuery(serviceHostNames),
      });

    return flamegraph;
  },
});

export const profilingRouteRepository = {
  ...profilingFlamegraphRoute,
};
