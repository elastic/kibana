/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { omit } from 'lodash';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import {
  downstreamDependenciesRouteRt,
  getAssistantDownstreamDependencies,
  type APMDownstreamDependency,
} from './get_apm_downstream_dependencies';
import { getApmTimeseries, getApmTimeseriesRt, type ApmTimeseries } from './get_apm_timeseries';
import {
  type ApmTraceWaterfall,
  getApmTracesRt,
  getApmTraceWaterfall,
} from './get_apm_trace_waterfall';

const getApmTimeSeriesRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/assistant/get_apm_timeseries',
  options: {
    tags: ['access:apm', 'access:ai_assistant'],
  },
  params: t.type({
    body: getApmTimeseriesRt,
  }),
  handler: async (
    resources
  ): Promise<{
    content: Array<Omit<ApmTimeseries, 'data'>>;
    data: ApmTimeseries[];
  }> => {
    const body = resources.params.body;

    const apmEventClient = await getApmEventClient(resources);

    const timeseries = await getApmTimeseries({
      apmEventClient,
      arguments: body,
    });

    return {
      content: timeseries.map((series): Omit<ApmTimeseries, 'data'> => omit(series, 'data')),
      data: timeseries,
    };
  },
});
const getDownstreamDependenciesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/assistant/get_downstream_dependencies',
  params: t.type({
    query: downstreamDependenciesRouteRt,
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (resources): Promise<{ content: APMDownstreamDependency[] }> => {
    const {
      params,
      request,
      plugins: { security },
    } = resources;

    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ security, request, probability: 1 }),
    ]);

    const { query } = params;

    return {
      content: await getAssistantDownstreamDependencies({
        arguments: query,
        apmEventClient,
        randomSampler,
      }),
    };
  },
});

const getApmTraceWatefallRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/assistant/get_apm_trace_waterfall',
  options: {
    tags: ['access:apm', 'access:ai_assistant'],
  },
  params: t.type({
    query: getApmTracesRt,
  }),
  handler: async (
    resources
  ): Promise<{
    content: Omit<ApmTraceWaterfall, 'data'>;
    data: ApmTraceWaterfall['data'];
  }> => {
    const { config, logger } = resources;
    const { query } = resources.params;

    const apmEventClient = await getApmEventClient(resources);

    const waterfall = await getApmTraceWaterfall({
      apmEventClient,
      arguments: query,
      config,
      logger,
    });

    return {
      content: {
        environment: waterfall.environment,
        start: waterfall.start,
        end: waterfall.end,
        ascii: waterfall.ascii,
      },
      data: waterfall.data,
    };
  },
});

export const assistantRouteRepository = {
  ...getApmTimeSeriesRoute,
  ...getDownstreamDependenciesRoute,
  ...getApmTraceWatefallRoute,
};
