/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { setupRequest } from '../../lib/helpers/setup_request';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, rangeRt } from '../default_api_types';
import {
  getTimelineCharts,
  TimelineChartsResponse,
} from './get_timeline_charts';

const timelineChartsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/timeline/charts',
  options: {
    tags: ['access:apm'],
  },
  params: t.type({
    query: t.intersection([
      rangeRt,
      environmentRt,
      t.type({
        serviceName: t.string,
      }),
    ]),
  }),
  handler: async (resources): Promise<TimelineChartsResponse> => {
    const setup = await setupRequest(resources);

    const {
      query: { start, end, environment, serviceName },
    } = resources.params;

    return getTimelineCharts({
      setup,
      start,
      end,
      environment,
      serviceName,
      logger: resources.logger,
    });
  },
});

export const timelineRouteRepository = {
  ...timelineChartsRoute,
};
