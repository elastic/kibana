/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ILegacyScopedClusterClient } from 'src/core/server';
import { CaseStatuses } from '../../../common/api';
import { AlertServiceContract } from '../../services';

interface UpdateAlertsStatusArgs {
  alertsService: AlertServiceContract;
  ids: string[];
  status: CaseStatuses;
  indices: Set<string>;
  // TODO: we have to use the one that the actions API gives us which is deprecated, but we'll need it updated there first I think
  callCluster: ILegacyScopedClusterClient['callAsCurrentUser'];
}

// TODO: remove this file
export const updateAlertsStatus = async ({
  alertsService,
  ids,
  status,
  indices,
  callCluster,
}: UpdateAlertsStatusArgs): Promise<void> => {
  await alertsService.updateAlertsStatus({ ids, status, indices, callCluster });
};
