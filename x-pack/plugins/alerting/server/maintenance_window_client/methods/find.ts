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

export interface FindResult {
  data: MaintenanceWindow[];
}

export async function find(context: MaintenanceWindowClientContext): Promise<FindResult> {
  const { savedObjectsClient, logger } = context;

  try {
    const result = await savedObjectsClient.find<MaintenanceWindowSOAttributes>({
      type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
    });

    return {
      data: result.saved_objects.map((so) =>
        getMaintenanceWindowFromRaw({
          attributes: so.attributes,
          id: so.id,
        })
      ),
    };
  } catch (e) {
    const errorMessage = `Failed to find maintenance window, Error: ${e}`;
    logger.error(errorMessage);
    throw Boom.boomify(e, { message: errorMessage });
  }
}
