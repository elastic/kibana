/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { API_BASE_PATH } from '../../../../common/constants';
import { httpService } from './http';
import { useRequest } from './use_request';

export const loadPermissions = () => {
  return useRequest({
    path: httpService.addBasePath(`${API_BASE_PATH}permissions`),
    method: 'get',
  });
};
