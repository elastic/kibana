/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { nodeBuilder, fromKueryExpression } from '@kbn/es-query';
import {
  MaintenanceWindow,
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
  interval: string;
}

export async function active(
  context: MaintenanceWindowClientContext,
  params: ActiveParams
): Promise<boolean> {
  const { savedObjectsClient, logger } = context;
  const { start, interval } = params;

  const startDate = start ? new Date(start) : new Date();
  const duration = parseDuration(interval);
  const endDate = moment(startDate).add(duration, 'ms').toDate();

  const startDateISO = startDate.toISOString();
  const endDateISO = endDate.toISOString();

  const filter = nodeBuilder.and([
    nodeBuilder.or([
      fromKueryExpression(`maintenance-window.attributes.events >= "${startDateISO}"`),
      fromKueryExpression(`maintenance-window.attributes.events <= "${endDateISO}"`),
    ]),
    nodeBuilder.is('maintenance-window.attributes.enabled', 'true'),
  ]);

  try {
    const { aggregations } = await savedObjectsClient.find<
      MaintenanceWindow,
      MaintenanceWindowAggregationResult
    >({
      type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      aggs: {
        maintenanceWindow: {
          date_histogram: {
            field: 'maintenance-window.attributes.events',
            fixed_interval: interval,
            min_doc_count: 0,
            extended_bounds: {
              min: startDateISO,
              max: endDateISO,
            },
            hard_bounds: {
              min: startDateISO,
              max: endDateISO,
            },
          },
        },
      },
      filter,
    });

    if (!aggregations) {
      return false;
    }
    return aggregations.maintenanceWindow.buckets.some((bucket) => {
      return bucket.doc_count > 0;
    });
  } catch (e) {
    const errorMessage = `Failed to find active maintenance window by interval: ${interval} with start date: ${startDate}, Error: ${e}`;
    logger.error(errorMessage);
  }
  return false;
}
