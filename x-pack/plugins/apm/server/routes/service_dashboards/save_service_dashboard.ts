/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import {
  APM_SERVICE_DASHBOARD_SAVED_OBJECT_TYPE,
  SavedServiceDashboard,
  ServiceDashboard,
} from '../../../common/service_dashboards';

interface Options {
  savedObjectsClient: SavedObjectsClientContract;
  serviceDashboardId?: string;
  serviceDashboard: ServiceDashboard;
}
export async function saveServiceDashbord({
  savedObjectsClient,
  serviceDashboardId,
  serviceDashboard,
}: Options): Promise<SavedServiceDashboard> {
  const t = {
    dashboardSavedObjectId: 'id-2',
    dashboardTitle: 'title-2',
    useContextFilter: false,
    kuery: 'link to',
    linkTo: 'single',
  };
  const {
    id,
    attributes,
    updated_at: updatedAt,
  } = await (serviceDashboardId
    ? savedObjectsClient.update(
        APM_SERVICE_DASHBOARD_SAVED_OBJECT_TYPE,
        serviceDashboardId,
        serviceDashboard
      )
    : savedObjectsClient.create(APM_SERVICE_DASHBOARD_SAVED_OBJECT_TYPE, t));
  return {
    id,
    ...(attributes as ServiceDashboard),
    updatedAt: updatedAt ? Date.parse(updatedAt) : 0,
  };
}
