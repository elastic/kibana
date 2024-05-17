/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsCreateOptions,
} from '@kbn/core/server';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '../../../../common';
import { MaintenanceWindowAttributes } from '../types';

export interface CreateMaintenanceWindowSoParams {
  savedObjectsClient: SavedObjectsClientContract;
  maintenanceWindowAttributes: MaintenanceWindowAttributes;
  savedObjectsCreateOptions?: SavedObjectsCreateOptions;
}

export const createMaintenanceWindowSo = (
  params: CreateMaintenanceWindowSoParams
): Promise<SavedObject<MaintenanceWindowAttributes>> => {
  const { savedObjectsClient, maintenanceWindowAttributes, savedObjectsCreateOptions } = params;

  return savedObjectsClient.create<MaintenanceWindowAttributes>(
    MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
    maintenanceWindowAttributes,
    savedObjectsCreateOptions
  );
};
