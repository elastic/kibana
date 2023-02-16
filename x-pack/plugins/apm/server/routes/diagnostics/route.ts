/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getApmPipelines } from './get_apm_pipelines';

const apmPipelinesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/diagnostics/pipelines',
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const { context } = resources;

    const esClient = (await context.core).elasticsearch.client;

    try {
      const apmPipelines = await getApmPipelines({
        esClient: esClient.asInternalUser,
      });
      return apmPipelines;
    } catch (error) {
      console.log(error);
    }
  },
});

export const apmDiagnosticsRepository = {
  ...apmPipelinesRoute,
};
