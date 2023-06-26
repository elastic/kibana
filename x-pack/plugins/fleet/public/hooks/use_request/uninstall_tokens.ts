/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uninstallTokensRouteService } from '../../../common/services';

import type {
  GetUninstallTokensRequest,
  GetUninstallTokensResponse,
} from '../../../common/types/rest_spec/uninstall_token';

import { useRequest } from './use_request';

export const useGetUninstallTokens = ({
  policyId,
  page,
  perPage,
}: GetUninstallTokensRequest['query'] = {}) => {
  const query: GetUninstallTokensRequest['query'] = {
    policyId,
    page,
    perPage,
  };

  return useRequest<GetUninstallTokensResponse>({
    method: 'get',
    path: uninstallTokensRouteService.getListPath(),
    query,
  });
};
