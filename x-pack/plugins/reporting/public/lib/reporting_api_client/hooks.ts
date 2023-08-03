/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_ROUTES } from '../../../common/constants';
import { IlmPolicyStatusResponse } from '../../../common/types';
import { useKibana, useRequest, UseRequestResponse } from '../../shared_imports';

export const useCheckIlmPolicyStatus = (): UseRequestResponse<IlmPolicyStatusResponse> => {
  const {
    services: { http },
  } = useKibana();
  return useRequest(http, { path: INTERNAL_ROUTES.MIGRATE.GET_ILM_POLICY_STATUS, method: 'get' });
};
