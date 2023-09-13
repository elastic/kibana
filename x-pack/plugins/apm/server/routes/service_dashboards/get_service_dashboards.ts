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

interface Props {
  savedObjectsClient: SavedObjectsClientContract;
  serviceName: string;
}

export async function getServiceDashboards({
  savedObjectsClient,
  serviceName,
}: Props): Promise<SavedServiceDashboard[]> {
  // savedObjectsClient.bulkDelete(APM_SERVICE_DASHBOARD_SAVED_OBJECT_TYPE);
  const result = await savedObjectsClient.find<ServiceDashboard>({
    type: APM_SERVICE_DASHBOARD_SAVED_OBJECT_TYPE,
    page: 1,
    perPage: 10,
  });

  console.log('result====', result);
  // const opt = result.saved_objects.map(
  //   ({ id, type, attributes, updated_at: upatedAt }) => ({ type, id })
  // );

  // savedObjectsClient.bulkDelete(opt);

  return result.saved_objects.map(
    ({ id, attributes, updated_at: upatedAt }) => ({
      id,
      updatedAt: upatedAt ? Date.parse(upatedAt) : 0,
      ...attributes,
    })
  );
}
