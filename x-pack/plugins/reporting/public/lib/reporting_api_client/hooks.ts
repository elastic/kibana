/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRequest, UseRequestResponse } from '../../shared_imports';
import { IlmPolicyStatusResponse } from '../../../common/types';

import { API_GET_ILM_POLICY_STATUS } from '../../../common/constants';

import { useKibana } from '../../shared_imports';

export const useCheckIlmPolicyStatus = (): UseRequestResponse<IlmPolicyStatusResponse> => {
  const {
    services: { http },
  } = useKibana();
  return useRequest(http, { path: API_GET_ILM_POLICY_STATUS, method: 'get' });
};
