/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { MaintenanceWindowAttributes } from '../types';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '../../../../common';

export interface FindMaintenanceWindowSoParams {
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectsFindOptions?: Omit<SavedObjectsFindOptions, 'type'>;
}

export const findMaintenanceWindowSo = <MaintenanceWindowAggregation = Record<string, unknown>>(
  params: FindMaintenanceWindowSoParams
): Promise<SavedObjectsFindResponse<MaintenanceWindowAttributes, MaintenanceWindowAggregation>> => {
  const { savedObjectsClient, savedObjectsFindOptions } = params;

  return savedObjectsClient.find<MaintenanceWindowAttributes, MaintenanceWindowAggregation>({
    ...(savedObjectsFindOptions ? savedObjectsFindOptions : {}),
    type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
  });
};
