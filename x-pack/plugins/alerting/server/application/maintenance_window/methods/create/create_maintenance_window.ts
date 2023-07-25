/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import Boom from '@hapi/boom';
import { SavedObjectsUtils } from '@kbn/core/server';
import { generateMaintenanceWindowEvents } from '../../lib/generate_maintenance_window_events';
import { MaintenanceWindowClientContext } from '../../../../../common';
import {
  transformMaintenanceWindowAttributesToMaintenanceWindow,
  transformMaintenanceWindowToMaintenanceWindowAttributes,
} from '../../transforms';
import { createMaintenanceWindowSo } from '../../../../data/maintenance_window';
import { createMaintenanceWindowDataSchema } from './schemas';
import { MaintenanceWindow } from '../../types';
import { CreateMaintenanceWindowData } from './types';

export interface CreateMaintenanceWindowParams {
  data: CreateMaintenanceWindowData;
}

export async function createMaintenanceWindow(
  context: MaintenanceWindowClientContext,
  params: CreateMaintenanceWindowParams
): Promise<MaintenanceWindow> {
  const { data } = params;
  const { savedObjectsClient, getModificationMetadata, logger } = context;
  const { title, duration, rRule } = data;

  try {
    createMaintenanceWindowDataSchema.validate(data);
  } catch (error) {
    throw Boom.badRequest(`Error validating create maintenance window data - ${error.message}`);
  }

  const id = SavedObjectsUtils.generateId();
  const expirationDate = moment().utc().add(1, 'year').toISOString();
  const modificationMetadata = await getModificationMetadata();

  const events = generateMaintenanceWindowEvents({ rRule, expirationDate, duration });
  const maintenanceWindowAttributes = transformMaintenanceWindowToMaintenanceWindowAttributes({
    title,
    enabled: true,
    expirationDate,
    rRule: rRule as MaintenanceWindow['rRule'],
    duration,
    events,
    ...modificationMetadata,
  });

  try {
    const result = await createMaintenanceWindowSo({
      savedObjectsClient,
      maintenanceWindowAttributes,
      savedObjectsCreateOptions: {
        id,
      },
    });

    return transformMaintenanceWindowAttributesToMaintenanceWindow({
      attributes: result.attributes,
      id: result.id,
    });
  } catch (e) {
    const errorMessage = `Failed to create maintenance window, Error: ${e}`;
    logger.error(errorMessage);
    throw Boom.boomify(e, { message: errorMessage });
  }
}
