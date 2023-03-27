/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { getMaintenanceWindowFromRaw } from '../get_maintenance_window_from_raw';
import {
  MaintenanceWindow,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
  MaintenanceWindowClientContext,
} from '../../../common';
import { retryIfConflicts } from '../../lib/retry_if_conflicts';

export interface ArchiveParams {
  id: string;
}

export async function archive(
  context: MaintenanceWindowClientContext,
  params: ArchiveParams
): Promise<MaintenanceWindow> {
  return await retryIfConflicts(
    context.logger,
    `maintenanceWindowClient.archive('${params.id})`,
    async () => {
      return await archiveWithOCC(context, params);
    }
  );
}

async function archiveWithOCC(
  context: MaintenanceWindowClientContext,
  params: ArchiveParams
): Promise<MaintenanceWindow> {
  const { savedObjectsClient, getModificationMetadata, logger } = context;
  const { id } = params;
  const modificationMetadata = await getModificationMetadata();

  try {
    const { attributes, version } = await savedObjectsClient.get<MaintenanceWindow>(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      id
    );
    const result = await savedObjectsClient.update<MaintenanceWindow>(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      id,
      {
        ...attributes,
        expirationDate: new Date().toISOString(),
        ...modificationMetadata,
      },
      {
        version,
      }
    );

    return getMaintenanceWindowFromRaw({
      attributes: {
        ...attributes,
        ...result.attributes,
      },
      id,
    });
  } catch (e) {
    const errorMessage = `Failed to archive maintenance window by id: ${id}, Error: ${e}`;
    logger.error(errorMessage);
    throw Boom.boomify(e, { message: errorMessage });
  }
}
