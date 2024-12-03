/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { MaintenanceWindow, MaintenanceWindowStatus } from '../../../common';
import type { FindMaintenanceWindowsResponse } from '../../../common/routes/maintenance_window/apis/find';
import { transformMaintenanceWindowResponse } from './transform_maintenance_window_response';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../common';

export async function findMaintenanceWindows({
  http,
  page,
  perPage,
  search,
  // statuses,
}: {
  http: HttpSetup;
  page: number;
  perPage: number;
  search: string;
  // statuses: MaintenanceWindowStatus[];
}): Promise<{ maintenanceWindows: MaintenanceWindow[], total: number }> {
  const res = await http.get<FindMaintenanceWindowsResponse>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/maintenance_window/_find`,
    {
      query: {
        page,
        per_page: perPage,
        search,
        // statuses
      }
    }
  );
  console.log('res', res)
  return { maintenanceWindows: res.data.map(transformMaintenanceWindowResponse), total: res.total };
}
