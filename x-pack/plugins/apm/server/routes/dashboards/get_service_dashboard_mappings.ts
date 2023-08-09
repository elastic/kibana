/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import {
  APM_SERVICE_CUSTOM_DASHBOARD_SAVED_OBJECT_TYPE,
  DashboardMappingType,
  SavedServiceDashboardMapping,
  ServiceDashboardMapping,
} from '../../../common/service_dashboards';

interface Props {
  savedObjectsClient: SavedObjectsClientContract;
  serviceName?: string;
  type?: DashboardMappingType;
}

export async function getServiceDashboardMappings({
  savedObjectsClient,
  serviceName,
  type,
}: Props): Promise<SavedServiceDashboardMapping[]> {
  const search = !!serviceName ? serviceName : !!type ? type : undefined;
  const searchFields = !!serviceName
    ? ['serviceName']
    : !!type
    ? ['type']
    : undefined;
  const result = await savedObjectsClient.find<ServiceDashboardMapping>({
    type: APM_SERVICE_CUSTOM_DASHBOARD_SAVED_OBJECT_TYPE,
    page: 1,
    perPage: 10,
    search,
    searchFields,
  });
  return result.saved_objects.map(
    ({ id, attributes, updated_at: upatedAt }) => ({
      id,
      updatedAt: upatedAt ? Date.parse(upatedAt) : 0,
      ...attributes,
    })
  );
}
