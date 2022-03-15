/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appRoutesService } from '../../services';
import type { CheckPermissionsResponse, GenerateServiceTokenResponse } from '../../types';

import { sendRequest, useRequest } from './use_request';

export const sendGetPermissionsCheck = (fleetServerSetup?: boolean) => {
  return sendRequest<CheckPermissionsResponse>({
    path: appRoutesService.getCheckPermissionsPath(),
    method: 'get',
    query: { fleetServerSetup },
  });
};

export const sendGenerateServiceToken = () => {
  return sendRequest<GenerateServiceTokenResponse>({
    path: appRoutesService.getRegenerateServiceTokenPath(),
    method: 'post',
  });
};

export const usePermissionCheck = () => {
  return useRequest<CheckPermissionsResponse>({
    path: appRoutesService.getCheckPermissionsPath(),
    method: 'get',
  });
};
