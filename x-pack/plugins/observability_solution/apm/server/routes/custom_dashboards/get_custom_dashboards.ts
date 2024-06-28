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

interface Props {
  savedObjectsClient: SavedObjectsClientContract;
}

export async function getCustomDashboards({
  savedObjectsClient,
}: Props): Promise<SavedApmCustomDashboard[]> {
  const result = await savedObjectsClient.find<ApmCustomDashboard>({
    type: APM_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
    page: 1,
    perPage: 1000,
    sortField: 'updated_at',
    sortOrder: 'desc',
  });

  return result.saved_objects.map(({ id, attributes, updated_at: upatedAt }) => ({
    id,
    updatedAt: upatedAt ? Date.parse(upatedAt) : 0,
    ...attributes,
  }));
}
