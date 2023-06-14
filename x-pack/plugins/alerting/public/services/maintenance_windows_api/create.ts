/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { AsApiContract, RewriteRequestCase, RewriteResponseCase } from '@kbn/actions-plugin/common';

import { MaintenanceWindow } from '../../pages/maintenance_windows/types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../common';

const rewriteBodyRequest: RewriteResponseCase<MaintenanceWindow> = ({ rRule, ...res }) => ({
  ...res,
  r_rule: rRule,
});

const rewriteBodyRes: RewriteRequestCase<MaintenanceWindow> = ({ r_rule: rRule, ...rest }) => ({
  ...rest,
  rRule,
});

export async function createMaintenanceWindow({
  http,
  maintenanceWindow,
}: {
  http: HttpSetup;
  maintenanceWindow: MaintenanceWindow;
}): Promise<MaintenanceWindow> {
  const res = await http.post<AsApiContract<MaintenanceWindow>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/maintenance_window`,
    { body: JSON.stringify(rewriteBodyRequest(maintenanceWindow)) }
  );

  return rewriteBodyRes(res);
}
