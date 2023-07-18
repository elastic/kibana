/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { getMaintenanceWindowFromRaw } from '../get_maintenance_window_from_raw';
import {
  MaintenanceWindowSOAttributes,
  MaintenanceWindow,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
  MaintenanceWindowClientContext,
} from '../../../common';

export interface BulkGetParams {
  ids: string[];
}

export interface BulkGetMaintenanceWindowError {
  id: string;
  error: string;
  message: string;
  statusCode: number;
}

export interface BulkGetResult {
  maintenanceWindows: MaintenanceWindow[];
  errors: BulkGetMaintenanceWindowError[];
}

export async function bulkGet(
  context: MaintenanceWindowClientContext,
  params: BulkGetParams
): Promise<BulkGetResult> {
  const { savedObjectsClient, logger } = context;
  const { ids } = params;

  const bulkGetObjects = ids.map((id) => ({ id, type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE }));

  try {
    const { saved_objects: savedObjects } =
      await savedObjectsClient.bulkGet<MaintenanceWindowSOAttributes>(bulkGetObjects);

    const maintenanceWindows: MaintenanceWindow[] = [];
    const errors: BulkGetMaintenanceWindowError[] = [];

    savedObjects.forEach((so) => {
      if (so.error) {
        errors.push({
          id: so.id,
          error: so.error.error,
          message: so.error.message,
          statusCode: so.error.statusCode,
        });
      } else {
        maintenanceWindows.push(
          getMaintenanceWindowFromRaw({
            id: so.id,
            attributes: so.attributes,
          })
        );
      }
    });

    return {
      maintenanceWindows,
      errors,
    };
  } catch (e) {
    const errorMessage = `Failed to bulk get maintenance window for ids: ${ids}, Error: ${e}`;
    logger.error(errorMessage);
    throw Boom.boomify(e, { message: errorMessage });
  }
}
