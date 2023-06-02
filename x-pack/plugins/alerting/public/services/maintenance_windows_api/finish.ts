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

const rewriteBodyRes: RewriteRequestCase<MaintenanceWindow> = ({ r_rule: rRule, ...rest }) => ({
  ...rest,
  rRule,
});

export async function finishMaintenanceWindow({
  http,
  maintenanceWindowId,
}: {
  http: HttpSetup;
  maintenanceWindowId: string;
}): Promise<MaintenanceWindow> {
  const res = await http.post<AsApiContract<MaintenanceWindow>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/maintenance_window/${encodeURIComponent(
      maintenanceWindowId
    )}/_finish`
  );

  return rewriteBodyRes(res);
}
