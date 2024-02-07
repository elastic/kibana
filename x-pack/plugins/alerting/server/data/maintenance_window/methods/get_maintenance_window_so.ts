/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract, SavedObject } from '@kbn/core/server';
import { MaintenanceWindowAttributes } from '../types';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '../../../../common';

export interface GetMaintenanceWindowSoParams {
  id: string;
  savedObjectsClient: SavedObjectsClientContract;
}

export const getMaintenanceWindowSo = (
  params: GetMaintenanceWindowSoParams
): Promise<SavedObject<MaintenanceWindowAttributes>> => {
  const { id, savedObjectsClient } = params;

  return savedObjectsClient.get<MaintenanceWindowAttributes>(
    MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
    id
  );
};
