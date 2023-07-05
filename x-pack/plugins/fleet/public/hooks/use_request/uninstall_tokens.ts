/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uninstallTokensRouteService } from '../../../common/services';

import type {
  GetUninstallTokensMetadataRequest,
  GetUninstallTokensMetadataResponse,
  GetUninstallTokenResponse,
} from '../../../common/types/rest_spec/uninstall_token';

import { sendRequest, useRequest } from './use_request';

export const useGetUninstallTokens = ({
  policyId,
  page,
  perPage,
}: GetUninstallTokensMetadataRequest['query'] = {}) => {
  const query: GetUninstallTokensMetadataRequest['query'] = {
    policyId,
    page,
    perPage,
  };

  return useRequest<GetUninstallTokensMetadataResponse>({
    method: 'get',
    path: uninstallTokensRouteService.getListPath(),
    query,
  });
};

export const useGetUninstallToken = (uninstallTokenId: string) =>
  useRequest<GetUninstallTokenResponse>({
    method: 'get',
    path: uninstallTokensRouteService.getInfoPath(uninstallTokenId),
  });

export const sendGetUninstallToken = (uninstallTokenId: string) =>
  sendRequest<GetUninstallTokenResponse>({
    method: 'get',
    path: uninstallTokensRouteService.getInfoPath(uninstallTokenId),
  });
