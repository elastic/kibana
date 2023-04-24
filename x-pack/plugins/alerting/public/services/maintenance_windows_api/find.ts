/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { AsApiContract, RewriteRequestCase } from '@kbn/actions-plugin/common';

import { MaintenanceWindowFindResponse } from '../../pages/maintenance_windows/types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../common';

const rewriteBodyRes = (results: {
  data: Array<AsApiContract<MaintenanceWindowFindResponse>>;
  total: number;
}): MaintenanceWindowFindResponse[] => {
  return results.data.map((item) => transform(item));
};

const transform: RewriteRequestCase<MaintenanceWindowFindResponse> = ({
  expiration_date: expirationDate,
  r_rule: rRule,
  event_start_time: eventStartTime,
  event_end_time: eventEndTime,
  created_by: createdBy,
  updated_by: updatedBy,
  created_at: createdAt,
  updated_at: updatedAt,
  ...rest
}) => ({
  ...rest,
  expirationDate,
  rRule,
  eventStartTime,
  eventEndTime,
  createdBy,
  updatedBy,
  createdAt,
  updatedAt,
});

export async function findMaintenanceWindows({
  http,
}: {
  http: HttpSetup;
}): Promise<MaintenanceWindowFindResponse[]> {
  const res = await http.get<{
    data: Array<AsApiContract<MaintenanceWindowFindResponse>>;
    total: number;
  }>(`${INTERNAL_BASE_ALERTING_API_PATH}/rules/maintenance_window/_find`);
  return rewriteBodyRes(res);
}
