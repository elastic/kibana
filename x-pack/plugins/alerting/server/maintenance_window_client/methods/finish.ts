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
import { getMaintenanceWindowDateAndStatus } from '../get_maintenance_window_date_and_status';
import { getMaintenanceWindowFromRaw } from '../get_maintenance_window_from_raw';
import {
  MaintenanceWindowSOAttributes,
  MaintenanceWindow,
  DateRange,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
  MaintenanceWindowClientContext,
  MaintenanceWindowStatus,
} from '../../../common';
import { retryIfConflicts } from '../../lib/retry_if_conflicts';

export interface FinishParams {
  id: string;
}

export async function finish(
  context: MaintenanceWindowClientContext,
  params: FinishParams
): Promise<MaintenanceWindow> {
  return await retryIfConflicts(
    context.logger,
    `maintenanceWindowClient.finish('${params.id})`,
    async () => {
      return await finishWithOCC(context, params);
    }
  );
}

async function finishWithOCC(
  context: MaintenanceWindowClientContext,
  params: FinishParams
): Promise<MaintenanceWindow> {
  const { savedObjectsClient, getModificationMetadata, logger } = context;
  const { id } = params;

  const modificationMetadata = await getModificationMetadata();
  const now = new Date();
  const expirationDate = moment.utc(now).add(1, 'year').toDate();

  try {
    const {
      attributes,
      version,
      id: fetchedId,
    } = await savedObjectsClient.get<MaintenanceWindowSOAttributes>(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      id
    );

    // Generate new events with new expiration date
    const newEvents = generateMaintenanceWindowEvents({
      rRule: attributes.rRule,
      duration: attributes.duration,
      expirationDate: expirationDate.toISOString(),
    });

    // Merge it with the old events
    const events = mergeEvents({
      newEvents,
      oldEvents: attributes.events,
    });

    // Find the current event and status of the maintenance window
    const { status, index } = getMaintenanceWindowDateAndStatus({
      events,
      dateToCompare: now,
      expirationDate,
    });

    // Throw if the maintenance window is not running, or event doesn't exist
    if (status !== MaintenanceWindowStatus.Running) {
      throw Boom.badRequest('Cannot finish maintenance window that is not running');
    }
    if (typeof index !== 'number' || !events[index]) {
      throw Boom.badRequest('Cannot find maintenance window event to finish');
    }

    // Update the running event to finish now
    const eventToFinish: DateRange = {
      gte: events[index].gte,
      lte: now.toISOString(),
    };

    // Update the events with the new finished event
    const eventsWithFinishedEvent = [...events];
    eventsWithFinishedEvent[index] = eventToFinish;

    const result = await savedObjectsClient.update<MaintenanceWindowSOAttributes>(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      fetchedId,
      {
        events: eventsWithFinishedEvent,
        expirationDate: expirationDate.toISOString(),
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
      id: result.id,
    });
  } catch (e) {
    const errorMessage = `Failed to finish maintenance window by id: ${id}, Error: ${e}`;
    logger.error(errorMessage);
    throw Boom.boomify(e, { message: errorMessage });
  }
}
