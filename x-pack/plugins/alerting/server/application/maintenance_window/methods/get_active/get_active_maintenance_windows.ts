/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { nodeBuilder } from '@kbn/es-query';
import type { MaintenanceWindowClientContext } from '../../../../../common';
import type { MaintenanceWindow } from '../../types';
import { transformMaintenanceWindowAttributesToMaintenanceWindow } from '../../transforms';
import { findMaintenanceWindowSo } from '../../../../data/maintenance_window';

export interface MaintenanceWindowAggregationResult {
  maintenanceWindow: {
    buckets: Array<{
      key_as_string: string;
      key: string;
      doc_count: number;
    }>;
  };
}

export async function getActiveMaintenanceWindows(
  context: MaintenanceWindowClientContext
): Promise<MaintenanceWindow[]> {
  const { savedObjectsClient, logger } = context;

  const startDate = new Date();
  const startDateISO = startDate.toISOString();

  const filter = nodeBuilder.and([
    nodeBuilder.is('maintenance-window.attributes.events', startDateISO),
    nodeBuilder.is('maintenance-window.attributes.enabled', 'true'),
  ]);

  try {
    const { saved_objects: savedObjects } = await findMaintenanceWindowSo({
      savedObjectsClient,
      savedObjectsFindOptions: { filter },
    });

    return savedObjects.map((savedObject) => {
      return transformMaintenanceWindowAttributesToMaintenanceWindow({
        attributes: savedObject.attributes,
        id: savedObject.id,
      });
    });
  } catch (e) {
    const errorMessage = `Failed to find active maintenance window by interval, Error: ${e}`;
    logger.error(errorMessage);
    throw Boom.boomify(e, { message: errorMessage });
  }
}
