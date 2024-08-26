/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import Boom from '@hapi/boom';
import type { MaintenanceWindowClientContext } from '../../../../../common';
import type { MaintenanceWindow } from '../../types';
import type { ArchiveMaintenanceWindowParams } from './types';
import { archiveMaintenanceWindowParamsSchema } from './schemas';
import {
  generateMaintenanceWindowEvents,
  mergeEvents,
} from '../../lib/generate_maintenance_window_events';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import {
  transformMaintenanceWindowAttributesToMaintenanceWindow,
  transformMaintenanceWindowToMaintenanceWindowAttributes,
} from '../../transforms';
import {
  getMaintenanceWindowSo,
  updateMaintenanceWindowSo,
} from '../../../../data/maintenance_window';

const getArchivedExpirationDate = (shouldArchive: boolean) => {
  if (shouldArchive) {
    return new Date().toISOString();
  }
  return moment.utc().add(1, 'year').toISOString();
};

export async function archiveMaintenanceWindow(
  context: MaintenanceWindowClientContext,
  params: ArchiveMaintenanceWindowParams
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
  params: ArchiveMaintenanceWindowParams
): Promise<MaintenanceWindow> {
  try {
    archiveMaintenanceWindowParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Error validating archive params - ${error.message}`);
  }

  const { savedObjectsClient, getModificationMetadata, logger } = context;
  const { id, archive: shouldArchive } = params;

  const modificationMetadata = await getModificationMetadata();
  const expirationDate = getArchivedExpirationDate(shouldArchive);

  try {
    const { attributes, version } = await getMaintenanceWindowSo({
      id,
      savedObjectsClient,
    });

    const events = mergeEvents({
      newEvents: generateMaintenanceWindowEvents({
        // @ts-expect-error upgrade typescript v5.1.6
        rRule: attributes.rRule,
        duration: attributes.duration,
        expirationDate,
      }),
      oldEvents: attributes.events,
    });

    const updatedMaintenanceWindowAttributes =
      transformMaintenanceWindowToMaintenanceWindowAttributes({
        ...attributes,
        events,
        expirationDate,
        updatedAt: modificationMetadata.updatedAt,
        updatedBy: modificationMetadata.updatedBy,
      });

    const result = await updateMaintenanceWindowSo({
      id,
      savedObjectsClient,
      updateMaintenanceWindowAttributes: updatedMaintenanceWindowAttributes,
      savedObjectsUpdateOptions: {
        version,
      },
    });

    return transformMaintenanceWindowAttributesToMaintenanceWindow({
      attributes: {
        ...attributes,
        ...result.attributes,
      },
      id: result.id,
    });
  } catch (e) {
    const errorMessage = `Failed to archive maintenance window by id: ${id}, Error: ${e}`;
    logger.error(errorMessage);
    throw Boom.boomify(e, { message: errorMessage });
  }
}
