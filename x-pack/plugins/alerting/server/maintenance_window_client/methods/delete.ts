/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
  MaintenanceWindowClientContext,
} from '../../../common';
import { retryIfConflicts } from '../../lib/retry_if_conflicts';

export interface DeleteParams {
  id: string;
}

export async function deleteMaintenanceWindow(
  context: MaintenanceWindowClientContext,
  params: DeleteParams
): Promise<{}> {
  return await retryIfConflicts(
    context.logger,
    `maintenanceWindowClient.delete('${params.id}')`,
    async () => await deleteWithOCC(context, params)
  );
}

async function deleteWithOCC(
  context: MaintenanceWindowClientContext,
  params: DeleteParams
): Promise<{}> {
  const { savedObjectsClient, logger } = context;
  const { id } = params;
  try {
    return await savedObjectsClient.delete(MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE, id);
  } catch (e) {
    const errorMessage = `Failed to delete maintenance window by id: ${id}, Error: ${e}`;
    logger.error(errorMessage);
    throw Boom.boomify(e, { message: errorMessage });
  }
}
