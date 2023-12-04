/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { AsApiContract, RewriteRequestCase } from '@kbn/actions-plugin/common';

import { MaintenanceWindow } from '../../pages/maintenance_windows/types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../common';

const rewriteBodyRes: RewriteRequestCase<MaintenanceWindow> = ({
  r_rule: rRule,
  category_ids: categoryIds,
  scoped_query: scopedQuery,
  ...rest
}) => ({
  ...rest,
  scopedQuery,
  categoryIds,
  rRule,
});

export async function getMaintenanceWindow({
  http,
  maintenanceWindowId,
}: {
  http: HttpSetup;
  maintenanceWindowId: string;
}): Promise<MaintenanceWindow> {
  const res = await http.get<AsApiContract<MaintenanceWindow>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/maintenance_window/${encodeURIComponent(
      maintenanceWindowId
    )}`
  );

  return rewriteBodyRes(res);
}
