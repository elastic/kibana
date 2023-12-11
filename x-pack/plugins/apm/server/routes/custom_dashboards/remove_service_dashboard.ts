/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { APM_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE } from '../../../common/custom_dashboards';

interface Options {
  savedObjectsClient: SavedObjectsClientContract;
  customDashboardId: string;
}
export async function deleteServiceDashboard({
  savedObjectsClient,
  customDashboardId,
}: Options) {
  return savedObjectsClient.delete(
    APM_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
    customDashboardId
  );
}
