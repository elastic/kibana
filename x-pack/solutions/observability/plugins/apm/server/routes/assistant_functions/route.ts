/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit } from 'lodash';
import type { ApmTimeseries } from '@kbn/apm-types';
import {
  routeDefinitions,
  type GetApmTimeseriesResponse,
  type GetDownstreamDependenciesResponse,
} from '@kbn/apm-api-shared';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getApmDownstreamDependencies } from './get_apm_downstream_dependencies';
import { getApmTimeseries } from './get_apm_timeseries';

const getApmTimeSeriesRoute = createApmServerRoute({
  endpoint: routeDefinitions.assistantFunctions.getApmTimeseries.endpoint,
  params: routeDefinitions.assistantFunctions.getApmTimeseries.params,
  security: {
    authz: {
      requiredPrivileges: ['apm', 'ai_assistant'],
    },
  },
  handler: async (resources): Promise<GetApmTimeseriesResponse> => {
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
  endpoint: routeDefinitions.assistantFunctions.getDownstreamDependencies.endpoint,
  params: routeDefinitions.assistantFunctions.getDownstreamDependencies.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<GetDownstreamDependenciesResponse> => {
    const { params, request, core } = resources;

    const coreStart = await core.start();
    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ coreStart, request, probability: 1 }),
    ]);

    const { query } = params;

    return {
      content: await getApmDownstreamDependencies({
        arguments: query,
        apmEventClient,
        randomSampler,
      }),
    };
  },
});

export const assistantRouteRepository = {
  ...getApmTimeSeriesRoute,
  ...getDownstreamDependenciesRoute,
};
