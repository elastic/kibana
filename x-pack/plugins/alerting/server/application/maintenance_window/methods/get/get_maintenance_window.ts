/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { MaintenanceWindowClientContext } from '../../../../../common';
import type { MaintenanceWindow } from '../../types';
import type { GetMaintenanceWindowParams } from './types';
import { transformMaintenanceWindowAttributesToMaintenanceWindow } from '../../transforms';
import { getMaintenanceWindowParamsSchema } from './schemas';
import { getMaintenanceWindowSo } from '../../../../data/maintenance_window';

export async function getMaintenanceWindow(
  context: MaintenanceWindowClientContext,
  params: GetMaintenanceWindowParams
): Promise<MaintenanceWindow> {
  const { savedObjectsClient, logger } = context;
  const { id } = params;

  try {
    getMaintenanceWindowParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Error validating get maintenance window data - ${error.message}`);
  }

  try {
    const result = await getMaintenanceWindowSo({
      id,
      savedObjectsClient,
    });

    return transformMaintenanceWindowAttributesToMaintenanceWindow({
      attributes: result.attributes,
      id: result.id,
    });
  } catch (e) {
    const errorMessage = `Failed to get maintenance window by id: ${id}, Error: ${e}`;
    logger.error(errorMessage);
    throw Boom.boomify(e, { message: errorMessage });
  }
}
