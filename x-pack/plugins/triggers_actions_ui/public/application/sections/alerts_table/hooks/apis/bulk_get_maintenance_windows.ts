/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core-http-browser';
import {
  MaintenanceWindow,
  INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH,
} from '@kbn/alerting-plugin/common';
import { AsApiContract } from '@kbn/actions-plugin/common';

export interface BulkGetMaintenanceWindowsParams {
  http: HttpStart;
  ids: string[];
}

export interface BulkGetMaintenanceWindowError {
  id: string;
  error: string;
  message: string;
  statusCode: number;
}

export interface BulkGetMaintenanceWindowsResponse {
  maintenance_windows: Array<AsApiContract<MaintenanceWindow>>;
  errors: Array<AsApiContract<BulkGetMaintenanceWindowError>>;
}

export interface BulkGetMaintenanceWindowsResult {
  maintenanceWindows: MaintenanceWindow[];
  errors: BulkGetMaintenanceWindowError[];
}

const rewriteMaintenanceWindowRes = ({
  expiration_date: expirationDate,
  r_rule: rRule,
  created_by: createdBy,
  updated_by: updatedBy,
  created_at: createdAt,
  updated_at: updatedAt,
  event_start_time: eventStartTime,
  event_end_time: eventEndTime,
  category_ids: categoryIds,
  ...rest
}: AsApiContract<MaintenanceWindow>): MaintenanceWindow => ({
  ...rest,
  expirationDate,
  rRule,
  createdBy,
  updatedBy,
  createdAt,
  updatedAt,
  eventStartTime,
  eventEndTime,
  categoryIds,
});

const rewriteErrorRes = ({
  status_code: statusCode,
  ...rest
}: AsApiContract<BulkGetMaintenanceWindowError>): BulkGetMaintenanceWindowError => ({
  ...rest,
  statusCode,
});

const rewriteBodyRes = (
  response: BulkGetMaintenanceWindowsResponse
): BulkGetMaintenanceWindowsResult => {
  return {
    maintenanceWindows: response.maintenance_windows.map((mw) => rewriteMaintenanceWindowRes(mw)),
    errors: response.errors.map((error) => rewriteErrorRes(error)),
  };
};

export const bulkGetMaintenanceWindows = async ({
  http,
  ids,
}: BulkGetMaintenanceWindowsParams): Promise<BulkGetMaintenanceWindowsResult> => {
  const res = await http.post<BulkGetMaintenanceWindowsResponse>(
    `${INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH}/_bulk_get`,
    {
      body: JSON.stringify({ ids }),
    }
  );

  return rewriteBodyRes(res);
};
