/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { omit } from 'lodash';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import {
  downstreamDependenciesRouteRt,
  getAssistantDownstreamDependencies,
  type APMDownstreamDependency,
} from './get_apm_downstream_dependencies';
import {
  getApmTimeseries,
  getApmTimeseriesRt,
  type ApmTimeseries,
} from './get_apm_timeseries';

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
      content: timeseries.map(
        (series): Omit<ApmTimeseries, 'data'> => omit(series, 'data')
      ),
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
  handler: async (
    resources
  ): Promise<{ content: APMDownstreamDependency[] }> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const { query } = params;

    return {
      content: await getAssistantDownstreamDependencies({
        arguments: query,
        apmEventClient,
      }),
    };
  },
});

export const assistantRouteRepository = {
  ...getApmTimeSeriesRoute,
  ...getDownstreamDependenciesRoute,
};
