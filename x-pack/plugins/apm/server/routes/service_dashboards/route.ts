/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { saveServiceDashbord } from './save_service_dashboard';
import { SavedServiceDashboard } from '../../../common/service_dashboards';

const serviceDashboardSaveRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/service-dashboard',
  params: t.type({
    query: t.union([
      t.partial({
        serviceDashboardId: t.string,
      }),
      t.undefined,
    ]),
    body: t.type({
      id: t.string,
      title: t.string,
      kuery: t.string,
      serviceName: t.union([t.string, t.undefined]),
      environment: t.union([t.string, t.undefined]),
    }),
  }),
  options: { tags: ['access:apm', 'access:apm_write'] },
  handler: async (resources): Promise<SavedServiceDashboard> => {
    const { context, params } = resources;
    const { serviceDashboardId } = params.query;
    const {
      savedObjects: { client: savedObjectsClient },
    } = await context.core;

    return saveServiceDashbord({
      savedObjectsClient,
      serviceDashboardId,
      serviceDashboard: params.body,
    });
  },
});

export const serviceDashboardsRouteRepository = {
  ...serviceDashboardSaveRoute,
};
