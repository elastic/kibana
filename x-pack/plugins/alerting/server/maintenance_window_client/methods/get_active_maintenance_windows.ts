/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import moment from 'moment';
import { nodeBuilder, fromKueryExpression } from '@kbn/es-query';
import { getMaintenanceWindowFromRaw } from '../get_maintenance_window_from_raw';
import {
  MaintenanceWindow,
  MaintenanceWindowSOAttributes,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
  parseDuration,
  MaintenanceWindowClientContext,
} from '../../../common';

export interface MaintenanceWindowAggregationResult {
  maintenanceWindow: {
    buckets: Array<{
      key_as_string: string;
      key: string;
      doc_count: number;
    }>;
  };
}

export interface ActiveParams {
  start?: string;
  interval?: string;
}

export async function getActiveMaintenanceWindows(
  context: MaintenanceWindowClientContext,
  params?: ActiveParams
): Promise<MaintenanceWindow[]> {
  const { savedObjectsClient, logger } = context;
  const { start, interval } = params || {};

  const startDate = start ? new Date(start) : new Date();
  const duration = interval ? parseDuration(interval) : 0;
  const endDate = moment.utc(startDate).add(duration, 'ms').toDate();

  const startDateISO = startDate.toISOString();
  const endDateISO = endDate.toISOString();

  const filter = nodeBuilder.and([
    nodeBuilder.and([
      fromKueryExpression(`maintenance-window.attributes.events >= "${startDateISO}"`),
      fromKueryExpression(`maintenance-window.attributes.events <= "${endDateISO}"`),
    ]),
    nodeBuilder.is('maintenance-window.attributes.enabled', 'true'),
  ]);

  try {
    const result = await savedObjectsClient.find<MaintenanceWindowSOAttributes>({
      type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      filter,
    });

    return result.saved_objects.map((so) =>
      getMaintenanceWindowFromRaw({
        attributes: so.attributes,
        id: so.id,
      })
    );
  } catch (e) {
    const errorMessage = `Failed to find active maintenance window by interval: ${interval} with start date: ${startDate.toISOString()}, Error: ${e}`;
    logger.error(errorMessage);
    throw Boom.boomify(e, { message: errorMessage });
  }
}
