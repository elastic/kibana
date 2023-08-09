/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { unionBy } from 'lodash';
import {
  DashboardMappingTypeEnum,
  SavedServiceDashboardMapping,
} from '../../../common/service_dashboards';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { titleRt, dashboardMappingTypeRt } from '../default_api_types';
import { saveDashboardMapping } from './add_service_dashboard_mapping';
import { deleteDashboardMapping } from './delete_service_dashboard_mapping';
import { getDashboardMappingsForService } from './get_dashboard_mappings_for_service';
import { getServiceDashboardMappings } from './get_service_dashboard_mappings';
import { DashboardSearchResponse, findDashboards } from './search_dashboards';

const searchDashboardsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/dashboards/search',
  params: t.type({
    query: titleRt,
  }),
  options: { tags: ['access:apm'] },
  async handler(resources): Promise<DashboardSearchResponse> {
    const { context, params } = resources;

    const { title } = params.query;
    const savedObjectsClient = (await context.core).savedObjects.client;
    return findDashboards(savedObjectsClient, title, ['title']);
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
  ): Promise<{ dashboardMappings: SavedServiceDashboardMapping[] }> => {
    const { context, params } = resources;
    const { serviceName } = params.path;

    const {
      savedObjects: { client: savedObjectsClient },
    } = await context.core;

    const [
      apmEventClient,
      serviceSpecificDashboards,
      allMultiServiceDashboards,
    ] = await Promise.all([
      getApmEventClient(resources),
      getServiceDashboardMappings({
        savedObjectsClient,
        serviceName,
      }),
      getServiceDashboardMappings({
        savedObjectsClient,
        type: DashboardMappingTypeEnum.multi,
      }),
    ]);

    const multiServiceDashboards = await getDashboardMappingsForService({
      apmEventClient,
      dashboardMappings: allMultiServiceDashboards,
      serviceName,
    });

    const dashboardMappings = unionBy(
      serviceSpecificDashboards,
      multiServiceDashboards,
      'id'
    );
    return { dashboardMappings };
  },
});

const serviceDashboardsAddRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/services/dashboards',
  params: t.type({
    body: t.intersection([
      t.type({
        dashboardId: t.string,
        dashboardName: t.string,
        type: dashboardMappingTypeRt,
        useContextFilter: t.boolean,
      }),
      t.partial({
        serviceName: t.string,
        kuery: t.string,
      }),
    ]),
  }),
  options: { tags: ['access:apm', 'access:apm_write'] },
  handler: async (resources): Promise<SavedServiceDashboardMapping> => {
    const { context, params } = resources;
    const {
      savedObjects: { client: savedObjectsClient },
    } = await context.core;

    return saveDashboardMapping({
      savedObjectsClient,
      dashboardMapping: { ...params.body },
    });
  },
});

const serviceDashboardsDeleteRoute = createApmServerRoute({
  endpoint: 'DELETE /internal/apm/services/dashboards',
  params: t.type({
    query: t.type({
      dashboardMappingId: t.string,
    }),
  }),
  options: { tags: ['access:apm', 'access:apm_write'] },
  handler: async (resources): Promise<void> => {
    const { context, params } = resources;
    const { dashboardMappingId } = params.query;
    const savedObjectsClient = (await context.core).savedObjects.client;
    await deleteDashboardMapping({
      savedObjectsClient,
      dashboardMappingId,
    });
  },
});

export const dashboardsRouteRepository = {
  ...searchDashboardsRoute,
  ...serviceDashboardsAddRoute,
  ...serviceDashboardsRoute,
  ...serviceDashboardsDeleteRoute,
};
