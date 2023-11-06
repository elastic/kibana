/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import { MaintenanceWindowAttributes } from '../types';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '../../../../common';

export interface UpdateMaintenanceWindowSoParams {
  id: string;
  savedObjectsClient: SavedObjectsClientContract;
  updateMaintenanceWindowAttributes: Partial<MaintenanceWindowAttributes>;
  savedObjectsUpdateOptions?: SavedObjectsUpdateOptions<MaintenanceWindowAttributes>;
}

export const updateMaintenanceWindowSo = (
  params: UpdateMaintenanceWindowSoParams
): Promise<SavedObjectsUpdateResponse<MaintenanceWindowAttributes>> => {
  const { id, savedObjectsClient, updateMaintenanceWindowAttributes, savedObjectsUpdateOptions } =
    params;

  return savedObjectsClient.update<MaintenanceWindowAttributes>(
    MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
    id,
    updateMaintenanceWindowAttributes,
    savedObjectsUpdateOptions
  );
};
