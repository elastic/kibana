/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { MaintenanceWindowClientContext } from '../../../../../common';
import { transformMaintenanceWindowAttributesToMaintenanceWindow } from '../../transforms';
import { findMaintenanceWindowSo } from '../../../../data/maintenance_window';
import type { FindMaintenanceWindowsResult } from './types';

export async function findMaintenanceWindows(
  context: MaintenanceWindowClientContext
): Promise<FindMaintenanceWindowsResult> {
  const { savedObjectsClient, logger } = context;

  try {
    const result = await findMaintenanceWindowSo({ savedObjectsClient });

    return {
      data: result.saved_objects.map((so) =>
        transformMaintenanceWindowAttributesToMaintenanceWindow({
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
