/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { CaseClientUpdateAlertsStatus, CaseClientFactoryArguments } from '../types';

export const updateAlertsStatus = ({
  alertsService,
  request,
  context,
}: CaseClientFactoryArguments) => async ({
  ids,
  status,
}: CaseClientUpdateAlertsStatus): Promise<void> => {
  const securitySolutionClient = context?.securitySolution?.getAppClient();
  if (securitySolutionClient == null) {
    throw Boom.notFound('securitySolutionClient client have not been found');
  }

  const index = securitySolutionClient.getSignalsIndex();
  await alertsService.updateAlertsStatus({ ids, status, index, request });
};
