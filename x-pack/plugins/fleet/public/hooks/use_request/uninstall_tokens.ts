/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { uninstallTokensRouteService } from '../../../common/services';

import type {
  GetUninstallTokensMetadataRequest,
  GetUninstallTokensMetadataResponse,
  GetUninstallTokenResponse,
} from '../../../common/types/rest_spec/uninstall_token';

import type { RequestError } from './use_request';
import { sendRequest, sendRequestForRq } from './use_request';

export const useGetUninstallTokens = (query: GetUninstallTokensMetadataRequest['query'] = {}) =>
  useQuery<GetUninstallTokensMetadataResponse, RequestError>(['useGetUninstallTokens', query], () =>
    sendRequestForRq({
      method: 'get',
      path: uninstallTokensRouteService.getListPath(),
      query,
    })
  );

export const useGetUninstallToken = (uninstallTokenId: string) =>
  useQuery<GetUninstallTokenResponse, RequestError>(
    ['useGetUninstallToken', uninstallTokenId],
    () =>
      sendRequestForRq({
        method: 'get',
        path: uninstallTokensRouteService.getInfoPath(uninstallTokenId),
      })
  );

export const sendGetUninstallToken = (uninstallTokenId: string) =>
  sendRequest<GetUninstallTokenResponse>({
    method: 'get',
    path: uninstallTokensRouteService.getInfoPath(uninstallTokenId),
  });
