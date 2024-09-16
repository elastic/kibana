/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '@kbn/core/public';
import type { MaintenanceWindow } from '../../../common';
import type { CreateMaintenanceWindowRequestBody } from '../../../server/routes/schemas/maintenance_window/apis/create';
import type { MaintenanceWindowResponse } from '../../../server/routes/schemas/maintenance_window/response';

import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../common';
import { transformMaintenanceWindowResponse } from './transform_maintenance_window_response';

export interface CreateParams {
  title: MaintenanceWindow['title'];
  duration: MaintenanceWindow['duration'];
  rRule: MaintenanceWindow['rRule'];
  categoryIds?: MaintenanceWindow['categoryIds'];
  scopedQuery?: MaintenanceWindow['scopedQuery'];
}

const transformCreateBodySchema = (
  createParams: CreateParams
): CreateMaintenanceWindowRequestBody => {
  return {
    title: createParams.title,
    duration: createParams.duration,
    r_rule: createParams.rRule as CreateMaintenanceWindowRequestBody['r_rule'],
    ...(createParams.categoryIds !== undefined
      ? {
          category_ids:
            createParams.categoryIds as CreateMaintenanceWindowRequestBody['category_ids'],
        }
      : {}),
    ...(createParams.scopedQuery !== undefined ? { scoped_query: createParams.scopedQuery } : {}),
  };
};

export async function createMaintenanceWindow({
  http,
  createParams,
}: {
  http: HttpSetup;
  createParams: CreateParams;
}): Promise<MaintenanceWindow> {
  const res = await http.post<MaintenanceWindowResponse>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/maintenance_window`,
    { body: JSON.stringify(transformCreateBodySchema(createParams)) }
  );

  return transformMaintenanceWindowResponse(res);
}
