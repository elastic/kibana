/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import Boom from '@hapi/boom';
import { SavedObjectsUtils } from '@kbn/core/server';
import { getMaintenanceWindowFromRaw } from '../get_maintenance_window_from_raw';
import { generateMaintenanceWindowEvents } from '../generate_maintenance_window_events';
import {
  MaintenanceWindowSOAttributes,
  MaintenanceWindow,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
  RRuleParams,
  MaintenanceWindowClientContext,
} from '../../../common';

export interface CreateParams {
  title: string;
  duration: number;
  rRule: RRuleParams;
}

export async function create(
  context: MaintenanceWindowClientContext,
  params: CreateParams
): Promise<MaintenanceWindow> {
  const { savedObjectsClient, getModificationMetadata, logger } = context;
  const { title, duration, rRule } = params;

  const id = SavedObjectsUtils.generateId();
  const expirationDate = moment().utc().add(1, 'year').toISOString();
  const modificationMetadata = await getModificationMetadata();

  try {
    const events = generateMaintenanceWindowEvents({ rRule, expirationDate, duration });
    const result = await savedObjectsClient.create<MaintenanceWindowSOAttributes>(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      {
        title,
        enabled: true,
        expirationDate,
        rRule,
        duration,
        events,
        ...modificationMetadata,
      },
      {
        id,
      }
    );
    return getMaintenanceWindowFromRaw({
      attributes: result.attributes,
      id: result.id,
    });
  } catch (e) {
    const errorMessage = `Failed to create maintenance window, Error: ${e}`;
    logger.error(errorMessage);
    throw Boom.boomify(e, { message: errorMessage });
  }
}
