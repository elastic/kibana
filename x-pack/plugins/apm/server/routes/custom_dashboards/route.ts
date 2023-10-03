/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { saveServiceDashbord } from './save_service_dashboard';
import { SavedApmCustomDashboard } from '../../../common/custom_dashboards';
import { deleteServiceDashboard } from './remove_service_dashboard';
import { getCustomDashboards } from './get_custom_dashboards';
import { getServicesWithDashboards } from './get_services_with_dashboards';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { rangeRt } from '../default_api_types';

const serviceDashboardSaveRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/custom-dashboard',
  params: t.type({
    query: t.union([
      t.partial({
        customDashboardId: t.string,
      }),
      t.undefined,
    ]),
    body: t.type({
      dashboardSavedObjectId: t.string,
      kuery: t.union([t.string, t.undefined]),
      serviceNameFilterEnabled: t.boolean,
      serviceEnvironmentFilterEnabled: t.boolean,
    }),
  }),
  options: { tags: ['access:apm', 'access:apm_write'] },
  handler: async (resources): Promise<SavedApmCustomDashboard> => {
    const { context, params } = resources;
    const { customDashboardId } = params.query;
    const {
      savedObjects: { client: savedObjectsClient },
    } = await context.core;

    return saveServiceDashbord({
      savedObjectsClient,
      customDashboardId,
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
    query: rangeRt,
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{ serviceDashboards: SavedApmCustomDashboard[] }> => {
    const { context, params } = resources;
    const { start, end } = params.query;

    const { serviceName } = params.path;

    const apmEventClient = await getApmEventClient(resources);

    const {
      savedObjects: { client: savedObjectsClient },
    } = await context.core;

    const allLinkedCustomDashboards = await getCustomDashboards({
      savedObjectsClient,
    });

    const servicesWithDashboards = await getServicesWithDashboards({
      apmEventClient,
      allLinkedCustomDashboards,
      serviceName,
      start,
      end,
    });

    return { serviceDashboards: servicesWithDashboards };
  },
});

const serviceDashboardDeleteRoute = createApmServerRoute({
  endpoint: 'DELETE /internal/apm/custom-dashboard',
  params: t.type({
    query: t.type({
      customDashboardId: t.string,
    }),
  }),
  options: { tags: ['access:apm', 'access:apm_write'] },
  handler: async (resources): Promise<void> => {
    const { context, params } = resources;
    const { customDashboardId } = params.query;
    const savedObjectsClient = (await context.core).savedObjects.client;
    await deleteServiceDashboard({
      savedObjectsClient,
      customDashboardId,
    });
  },
});

export const serviceDashboardsRouteRepository = {
  ...serviceDashboardSaveRoute,
  ...serviceDashboardDeleteRoute,
  ...serviceDashboardsRoute,
};
