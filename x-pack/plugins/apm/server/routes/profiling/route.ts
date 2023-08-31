/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { ElasticFlameGraph } from '@kbn/profiling-data-access-plugin/common/flamegraph';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { kueryRt, rangeRt } from '../default_api_types';

const profilingFlamegraphRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/profiling/flamegraph',
  params: t.type({ query: t.intersection([rangeRt, kueryRt]) }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<ElasticFlameGraph> => {
    const { context, plugins, params } = resources;
    const esClient = (await context.core).elasticsearch.client;
    const { start, end, kuery } = params.query;
    const profilingDataAccessStart = await plugins.profilingDataAccess.start();
    const flamegraph =
      await profilingDataAccessStart.services.fetchFlamechartData({
        esClient: esClient.asCurrentUser,
        rangeFrom: start / 1000,
        rangeTo: end / 1000,
        kuery,
      });

    return flamegraph;
  },
});

export const profilingRouteRepository = {
  ...profilingFlamegraphRoute,
};
