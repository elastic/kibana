/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sendRequest } from './use_request';
import { ingestSetupRouteService } from '../../services';
import { CreateFleetSetupResponse } from '../../types';

export const sendSetup = () => {
  return sendRequest<CreateFleetSetupResponse>({
    path: ingestSetupRouteService.postIngestSetupPath(),
    method: 'post',
  });
};

export const sendIsInitialized = () => {
  return sendRequest<CreateFleetSetupResponse>({
    path: ingestSetupRouteService.getIngestSetupPath(),
    method: 'get',
  });
};
