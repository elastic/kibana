/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CaseClientUpdateAlertsStatus, CaseClientFactoryArguments } from '../types';

export const updateAlertsStatus = ({
  alertsService,
  request,
  index,
}: CaseClientFactoryArguments) => async ({
  ids,
  status,
}: CaseClientUpdateAlertsStatus): Promise<void> => {
  await alertsService.updateAlertsStatus({ ids, status, index, request });
};
