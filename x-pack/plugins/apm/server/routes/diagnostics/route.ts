/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TransportRequestOptions } from '@elastic/elasticsearch';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getApmTemplates, getApmPipelines } from './get_apm_setup_config';

export const esClientRequestOptions: TransportRequestOptions = {
  ignore: [404],
};

const apmConfigurationsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/diagnostics/setup_config',
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const { context } = resources;

    const esClient = (await context.core).elasticsearch.client;

    const commonParams = {
      esClient: esClient.asInternalUser,
      options: esClientRequestOptions,
    };

    const [pipelines, templates] = await Promise.all([
      getApmPipelines(commonParams),
      getApmTemplates(commonParams),
    ]);

    return { pipelines, templates };
  },
});

export const apmDiagnosticsRepository = {
  ...apmConfigurationsRoute,
};
