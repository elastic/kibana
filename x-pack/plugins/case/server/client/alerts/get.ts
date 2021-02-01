/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { CaseClientGetAlerts, CaseClientFactoryArguments } from '../types';
import { CaseClientGetAlertsResponse } from './types';

export const get = ({ alertsService, request, context }: CaseClientFactoryArguments) => async ({
  ids,
}: CaseClientGetAlerts): Promise<CaseClientGetAlertsResponse> => {
  const securitySolutionClient = context?.securitySolution?.getAppClient();
  if (securitySolutionClient == null) {
    throw Boom.notFound('securitySolutionClient client have not been found');
  }

  const index = securitySolutionClient.getSignalsIndex();
  const alerts = await alertsService.getAlerts({ ids, index, request });
  return alerts.hits.hits.map((alert) => ({
    id: alert._id,
    index: alert._index,
    ...alert._source,
  }));
};
