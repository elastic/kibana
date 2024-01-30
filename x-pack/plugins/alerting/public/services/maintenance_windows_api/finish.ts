/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '@kbn/core/public';
import type { MaintenanceWindow } from '../../../common';
import type { MaintenanceWindowResponse } from '../../../common/routes/maintenance_window/response';

import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../common';
import { transformMaintenanceWindowResponse } from './transform_maintenance_window_response';

export async function finishMaintenanceWindow({
  http,
  maintenanceWindowId,
}: {
  http: HttpSetup;
  maintenanceWindowId: string;
}): Promise<MaintenanceWindow> {
  const res = await http.post<MaintenanceWindowResponse>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/maintenance_window/${encodeURIComponent(
      maintenanceWindowId
    )}/_finish`
  );

  return transformMaintenanceWindowResponse(res);
}
