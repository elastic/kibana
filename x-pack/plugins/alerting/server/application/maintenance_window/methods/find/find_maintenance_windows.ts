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
import type { FindMaintenanceWindowsResult, FindMaintenanceWindowsParams } from './types';
import { findMaintenanceWindowsParamsSchema } from './schemas';

export async function findMaintenanceWindows(
  context: MaintenanceWindowClientContext,
  params: FindMaintenanceWindowsParams
): Promise<FindMaintenanceWindowsResult> {
  const { savedObjectsClient, logger } = context;

  try {
    findMaintenanceWindowsParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Error validating find data - ${error.message}`);
  }

  try {
    const result = await findMaintenanceWindowSo({
      savedObjectsClient,
      ...(params ? { savedObjectsFindOptions: params } : {}),
    });

    return {
      page: result.page,
      perPage: result.per_page,
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
