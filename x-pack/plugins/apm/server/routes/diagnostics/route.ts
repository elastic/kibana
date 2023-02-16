/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { probabilityRt, rangeRt } from '../default_api_types';
import { getApmPipelines } from './get_apm_pipelines';
import { getServicesSummaryPerProcessorEvent } from './get_services_summary';

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

const servicesSummaryRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/diagnostics/services_summary',
  options: { tags: ['access:apm'] },
  params: t.type({
    query: t.intersection([rangeRt, probabilityRt]),
  }),
  handler: async (
    resources
  ): Promise<{
    services: Array<{
      name: string;
      transactions?: number;
      errors?: number;
      metrics?: number;
      spans?: number;
    }>;
  }> => {
    const {
      params: {
        query: { start, end, probability },
      },
      request,
      plugins: { security },
    } = resources;

    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ security, request, probability }),
    ]);

    return await getServicesSummaryPerProcessorEvent({
      apmEventClient,
      randomSampler,
      start,
      end,
    });
  },
});

export const apmDiagnosticsRepository = {
  ...apmPipelinesRoute,
  ...servicesSummaryRoute,
};
