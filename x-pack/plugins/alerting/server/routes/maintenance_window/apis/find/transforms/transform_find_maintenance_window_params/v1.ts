/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindMaintenanceWindowsRequestQuery } from '../../../../../../../common/routes/maintenance_window/apis/find';
import { FindMaintenanceWindowsParams } from '../../../../../../application/maintenance_window/methods/find/types';

export const transformFindMaintenanceWindowParams = (
  params: FindMaintenanceWindowsRequestQuery
): FindMaintenanceWindowsParams => ({
  ...(params.page ? { page: params.page } : {}),
  ...(params.per_page ? { perPage: params.per_page } : {}),
  ...(params.statuses ? { statuses: params.statuses } : {}),
  ...(params.search ? { search: params.search } : {})
});
