/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import {
  APM_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
  SavedApmCustomDashboard,
  ApmCustomDashboard,
} from '../../../common/custom_dashboards';

interface Options {
  savedObjectsClient: SavedObjectsClientContract;
  customDashboardId?: string;
  serviceDashboard: ApmCustomDashboard;
}
export async function saveServiceDashbord({
  savedObjectsClient,
  customDashboardId,
  serviceDashboard,
}: Options): Promise<SavedApmCustomDashboard> {
  const {
    id,
    attributes,
    updated_at: updatedAt,
  } = await (customDashboardId
    ? savedObjectsClient.update(
        APM_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
        customDashboardId,
        serviceDashboard
      )
    : savedObjectsClient.create(
        APM_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
        serviceDashboard
      ));
  return {
    id,
    ...(attributes as ApmCustomDashboard),
    updatedAt: updatedAt ? Date.parse(updatedAt) : 0,
  };
}
