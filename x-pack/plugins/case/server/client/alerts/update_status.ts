/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'src/core/server';
import { CaseStatuses } from '../../../common/api';
import { AlertServiceContract } from '../../services';

interface UpdateAlertsStatusArgs {
  alertsService: AlertServiceContract;
  request: KibanaRequest;
  ids: string[];
  status: CaseStatuses;
  indices: Set<string>;
}

// TODO: remove this file
export const updateAlertsStatus = async ({
  alertsService,
  request,
  ids,
  status,
  indices,
}: UpdateAlertsStatusArgs): Promise<void> => {
  await alertsService.updateAlertsStatus({ ids, status, indices, request });
};
