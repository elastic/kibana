/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformMaintenanceWindowToResponseV1 } from '../../../../transforms';
import type { FindMaintenanceWindowsResponseV1 } from '../../../../../../../common/routes/maintenance_window/apis/find';
import type { MaintenanceWindow } from '../../../../../../application/maintenance_window/types';
import type { FindMaintenanceWindowsResult } from '../../../../../../application/maintenance_window/methods/find/types';

export const transformFindMaintenanceWindowResponse = (
  result: FindMaintenanceWindowsResult
): FindMaintenanceWindowsResponseV1 => {
  return {
    page: result.page,
    per_page: result.perPage,
    total: result.total,
    data: result.data.map((maintenanceWindow: MaintenanceWindow) =>
      transformMaintenanceWindowToResponseV1(maintenanceWindow)
    ),
  };
};
