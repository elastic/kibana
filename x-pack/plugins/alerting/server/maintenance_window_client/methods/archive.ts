/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import Boom from '@hapi/boom';
import {
  generateMaintenanceWindowEvents,
  mergeEvents,
} from '../generate_maintenance_window_events';
import { getMaintenanceWindowFromRaw } from '../get_maintenance_window_from_raw';
import {
  MaintenanceWindowSOAttributes,
  MaintenanceWindow,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
  MaintenanceWindowClientContext,
} from '../../../common';
import { retryIfConflicts } from '../../lib/retry_if_conflicts';

export interface ArchiveParams {
  id: string;
  archive: boolean;
}

const getArchivedExpirationDate = (shouldArchive: boolean) => {
  if (shouldArchive) {
    return new Date().toISOString();
  }
  return moment.utc().add(1, 'year').toISOString();
};

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
  const { id, archive: shouldArchive } = params;

  const modificationMetadata = await getModificationMetadata();
  const expirationDate = getArchivedExpirationDate(shouldArchive);

  try {
    const { attributes, version } = await savedObjectsClient.get<MaintenanceWindowSOAttributes>(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      id
    );

    const events = mergeEvents({
      newEvents: generateMaintenanceWindowEvents({
        rRule: attributes.rRule,
        duration: attributes.duration,
        expirationDate,
      }),
      oldEvents: attributes.events,
    });

    const result = await savedObjectsClient.update<MaintenanceWindowSOAttributes>(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      id,
      {
        ...attributes,
        events,
        expirationDate,
        updatedAt: modificationMetadata.updatedAt,
        updatedBy: modificationMetadata.updatedBy,
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
