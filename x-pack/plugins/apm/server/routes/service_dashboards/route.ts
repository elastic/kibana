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
import { deleteServiceDashboard } from './remove_service_dashboard';
import { getLinkedCustomDashboards } from './get_linked_custom_dashboards';
import { getServicesWithDashboards } from './get_services_with_dashboards';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

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
      dashboardSavedObjectId: t.string,
      kuery: t.union([t.string, t.undefined]),
      useContextFilter: t.boolean,
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

const serviceDashboardsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/dashboards',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{ serviceDashboards: SavedServiceDashboard[] }> => {
    const { context, params } = resources;
    const { serviceName } = params.path;

    const apmEventClient = await getApmEventClient(resources);

    const {
      savedObjects: { client: savedObjectsClient },
    } = await context.core;

    const allLinkedCustomDashboards = await getLinkedCustomDashboards({
      savedObjectsClient,
    });

    const servicesWithDashboards = await getServicesWithDashboards({
      apmEventClient,
      allLinkedCustomDashboards,
      serviceName,
    });

    return { serviceDashboards: servicesWithDashboards };
  },
});

const serviceDashboardDeleteRoute = createApmServerRoute({
  endpoint: 'DELETE /internal/apm/service-dashboard',
  params: t.type({
    query: t.type({
      serviceDashboardId: t.string,
    }),
  }),
  options: { tags: ['access:apm', 'access:apm_write'] },
  handler: async (resources): Promise<void> => {
    const { context, params } = resources;
    const { serviceDashboardId } = params.query;
    const savedObjectsClient = (await context.core).savedObjects.client;
    await deleteServiceDashboard({
      savedObjectsClient,
      serviceDashboardId,
    });
  },
});

export const serviceDashboardsRouteRepository = {
  ...serviceDashboardSaveRoute,
  ...serviceDashboardDeleteRoute,
  ...serviceDashboardsRoute,
};
