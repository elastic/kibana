/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  routeDefinitions,
  type SaveServiceDashboardResponse,
  type GetServiceDashboardsResponse,
} from '@kbn/apm-api-shared';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { saveServiceDashbord } from './save_service_dashboard';
import { deleteServiceDashboard } from './remove_service_dashboard';
import { getCustomDashboards } from './get_custom_dashboards';
import { getServicesWithDashboards } from './get_services_with_dashboards';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

const serviceDashboardSaveRoute = createApmServerRoute({
  endpoint: routeDefinitions.customDashboards.saveServiceDashboard.endpoint,
  params: routeDefinitions.customDashboards.saveServiceDashboard.params,
  security: {
    authz: {
      requiredPrivileges: ['apm', 'apm_write'],
    },
  },
  handler: async (resources): Promise<SaveServiceDashboardResponse> => {
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
  endpoint: routeDefinitions.customDashboards.getServiceDashboards.endpoint,
  params: routeDefinitions.customDashboards.getServiceDashboards.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<GetServiceDashboardsResponse> => {
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
  endpoint: routeDefinitions.customDashboards.deleteServiceDashboard.endpoint,
  params: routeDefinitions.customDashboards.deleteServiceDashboard.params,
  security: {
    authz: {
      requiredPrivileges: ['apm', 'apm_write'],
    },
  },
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
