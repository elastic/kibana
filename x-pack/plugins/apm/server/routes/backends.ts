/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { setupRequest } from '../lib/helpers/setup_request';
import { environmentRt, kueryRt, offsetRt, rangeRt } from './default_api_types';
import { createApmServerRoute } from './create_apm_server_route';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';
import { getMetadataForBackend } from '../lib/backends/get_metadata_for_backend';
import { getLatencyChartsForBackend } from '../lib/backends/get_latency_charts_for_backend';

const backendMetadataRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/backends/{backendName}/metadata',
  params: t.type({
    path: t.type({
      backendName: t.string,
    }),
    query: rangeRt,
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { backendName } = params.path;

    const { start, end } = setup;

    const metadata = await getMetadataForBackend({
      backendName,
      setup,
      start,
      end,
    });

    return { metadata };
  },
});

const backendLatencyChartsRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/backends/{backendName}/charts/latency',
  params: t.type({
    path: t.type({
      backendName: t.string,
    }),
    query: t.intersection([rangeRt, kueryRt, environmentRt, offsetRt]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { backendName } = params.path;
    const { kuery, environment, offset } = params.query;

    const { start, end } = setup;

    const [currentTimeseries, comparisonTimeseries] = await Promise.all([
      getLatencyChartsForBackend({
        backendName,
        setup,
        start,
        end,
        kuery,
        environment,
      }),
      offset
        ? getLatencyChartsForBackend({
            backendName,
            setup,
            start,
            end,
            kuery,
            environment,
            offset,
          })
        : null,
    ]);

    return { currentTimeseries, comparisonTimeseries };
  },
});

export const backendsRouteRepository = createApmServerRouteRepository()
  .add(backendMetadataRoute)
  .add(backendLatencyChartsRoute);
