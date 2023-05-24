/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransportRequestOptions } from '@elastic/elasticsearch';
import * as t from 'io-ts';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { probabilityRt, rangeRt } from '../default_api_types';
import { getApmPipelines, getApmTemplates } from './get_apm_setup_config';
import { getServicesSummaryPerProcessorEvent } from './get_services_summary';

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
  ...apmConfigurationsRoute,
  ...servicesSummaryRoute,
};
