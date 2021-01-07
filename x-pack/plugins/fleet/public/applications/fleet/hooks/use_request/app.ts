/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sendRequest } from './use_request';
import { appRoutesService } from '../../services';
import { CheckPermissionsResponse } from '../../types';

export const sendGetPermissionsCheck = () => {
  return sendRequest<CheckPermissionsResponse>({
    path: appRoutesService.getCheckPermissionsPath(),
    method: 'get',
  });
};
