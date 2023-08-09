/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import {
  APM_SERVICE_CUSTOM_DASHBOARD_SAVED_OBJECT_TYPE,
  SavedServiceDashboardMapping,
  ServiceDashboardMapping,
} from '../../../common/service_dashboards';

interface Options {
  savedObjectsClient: SavedObjectsClientContract;
  dashboardMapping: ServiceDashboardMapping;
}
export async function saveDashboardMapping({
  savedObjectsClient,
  dashboardMapping,
}: Options): Promise<SavedServiceDashboardMapping> {
  const {
    id,
    attributes,
    updated_at: updatedAt,
  } = await savedObjectsClient.create(
    APM_SERVICE_CUSTOM_DASHBOARD_SAVED_OBJECT_TYPE,
    dashboardMapping
  );
  return {
    id,
    ...(attributes as ServiceDashboardMapping),
    updatedAt: updatedAt ? Date.parse(updatedAt) : 0,
  };
}
