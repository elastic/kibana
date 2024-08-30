/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '@kbn/core/public';
import type { MaintenanceWindow } from '../../../common';
import type { FindMaintenanceWindowsResponse } from '../../../server/routes/schemas/maintenance_window/apis/find';

import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../common';
import { transformMaintenanceWindowResponse } from './transform_maintenance_window_response';

export async function findMaintenanceWindows({
  http,
}: {
  http: HttpSetup;
}): Promise<MaintenanceWindow[]> {
  const res = await http.get<FindMaintenanceWindowsResponse['body']>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/maintenance_window/_find`
  );
  return res.data.map((mw) => transformMaintenanceWindowResponse(mw));
}
