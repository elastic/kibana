/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { fromKueryExpression } from '@kbn/es-query/src/kuery/ast/ast';
import { SERVICE_NAME } from '../../../common/es_fields/apm';
import {
  APM_SERVICE_DASHBOARD_SAVED_OBJECT_TYPE,
  SavedServiceDashboard,
  ServiceDashboard,
} from '../../../common/service_dashboards';

interface Props {
  savedObjectsClient: SavedObjectsClientContract;
  query: string;
}

export async function getServiceDashboards({
  savedObjectsClient,
  query,
}: Props): Promise<SavedServiceDashboard[]> {
  const result = await savedObjectsClient.find<ServiceDashboard>({
    type: APM_SERVICE_DASHBOARD_SAVED_OBJECT_TYPE,
    page: 1,
    perPage: 100,
    filter: query,
  });

  const all = await savedObjectsClient.find<ServiceDashboard>({
    type: APM_SERVICE_DASHBOARD_SAVED_OBJECT_TYPE,
    page: 1,
    perPage: 100,
  });

  const allAttibutes = all.saved_objects.map(
    ({ id, attributes, updated_at: upatedAt }) => ({
      id,
      updatedAt: upatedAt ? Date.parse(upatedAt) : 0,
      ...attributes,
    })
  );

  console.log('all====', allAttibutes);

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
