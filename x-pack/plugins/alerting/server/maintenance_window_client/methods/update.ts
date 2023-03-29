/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import Boom from '@hapi/boom';
import { getMaintenanceWindowFromRaw } from '../get_maintenance_window_from_raw';
import { generateMaintenanceWindowEvents } from '../generate_maintenance_window_events';
import {
  MaintenanceWindow,
  MaintenanceWindowSOAttributes,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
  RRuleParams,
  MaintenanceWindowClientContext,
} from '../../../common';
import { retryIfConflicts } from '../../lib/retry_if_conflicts';

export interface UpdateParams {
  id: string;
  title: string;
  enabled: boolean;
  duration: number;
  rRule: RRuleParams;
}

export async function update(
  context: MaintenanceWindowClientContext,
  params: UpdateParams
): Promise<MaintenanceWindow> {
  return await retryIfConflicts(
    context.logger,
    `maintenanceWindowClient.update('${params.id})`,
    async () => {
      return await updateWithOCC(context, params);
    }
  );
}

async function updateWithOCC(
  context: MaintenanceWindowClientContext,
  params: UpdateParams
): Promise<MaintenanceWindow> {
  const { savedObjectsClient, getModificationMetadata, logger } = context;
  const { id, title, enabled, duration, rRule } = params;
  const modificationMetadata = await getModificationMetadata();
  const expirationDate = moment.utc().add(1, 'year').toISOString();

  try {
    const {
      attributes,
      version,
      id: updatedId,
    } = await savedObjectsClient.get<MaintenanceWindowSOAttributes>(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      id
    );

    if (moment(attributes.expirationDate).isBefore(new Date())) {
      throw Boom.badRequest('Cannot edit archived maintenance windows');
    }

    const events = generateMaintenanceWindowEvents({ rRule, expirationDate, duration });

    const result = await savedObjectsClient.update<MaintenanceWindowSOAttributes>(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      updatedId,
      {
        ...attributes,
        title,
        enabled,
        expirationDate,
        duration,
        rRule,
        events,
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
      id: updatedId,
    });
  } catch (e) {
    const errorMessage = `Failed to update maintenance window by id: ${id}, Error: ${e}`;
    logger.error(errorMessage);
    throw Boom.boomify(e, { message: errorMessage });
  }
}
