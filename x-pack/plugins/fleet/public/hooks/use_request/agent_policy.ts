/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { agentPolicyRouteService } from '../../services';
import { API_VERSIONS } from '../../../common/constants';

import type {
  GetAgentPoliciesRequest,
  GetAgentPoliciesResponse,
  GetOneAgentPolicyResponse,
  GetFullAgentPolicyResponse,
  CreateAgentPolicyRequest,
  CreateAgentPolicyResponse,
  UpdateAgentPolicyRequest,
  UpdateAgentPolicyResponse,
  CopyAgentPolicyRequest,
  CopyAgentPolicyResponse,
  DeleteAgentPolicyRequest,
  DeleteAgentPolicyResponse,
  BulkGetAgentPoliciesResponse,
} from '../../types';

import { useRequest, sendRequest, useConditionalRequest, sendRequestForRq } from './use_request';
import type { SendConditionalRequestConfig, RequestError } from './use_request';

export const useGetAgentPolicies = (query?: GetAgentPoliciesRequest['query']) => {
  return useRequest<GetAgentPoliciesResponse>({
    path: agentPolicyRouteService.getListPath(),
    method: 'get',
    query,
    version: API_VERSIONS.public.v1,
  });
};

export const useGetAgentPoliciesQuery = (
  query?: GetAgentPoliciesRequest['query'],
  options?: { enabled?: boolean }
) => {
  return useQuery<GetAgentPoliciesResponse, RequestError>({
    queryKey: ['agentPolicies', query],
    queryFn: () =>
      sendRequestForRq<GetAgentPoliciesResponse>({
        path: agentPolicyRouteService.getListPath(),
        method: 'get',
        query,
        version: API_VERSIONS.public.v1,
      }),
    enabled: options?.enabled,
  });
};

export const useBulkGetAgentPoliciesQuery = (ids: string[], options?: { full?: boolean }) => {
  return useQuery<BulkGetAgentPoliciesResponse, RequestError>(['agentPolicies', ids], () =>
    sendRequestForRq<BulkGetAgentPoliciesResponse>({
      path: agentPolicyRouteService.getBulkGetPath(),
      method: 'post',
      body: JSON.stringify({ ids, full: options?.full }),
      version: API_VERSIONS.public.v1,
    })
  );
};

export const sendGetAgentPolicies = (query?: GetAgentPoliciesRequest['query']) => {
  return sendRequest<GetAgentPoliciesResponse>({
    path: agentPolicyRouteService.getListPath(),
    method: 'get',
    query,
    version: API_VERSIONS.public.v1,
  });
};

export const useGetOneAgentPolicy = (agentPolicyId: string | undefined) => {
  return useConditionalRequest<GetOneAgentPolicyResponse>({
    path: agentPolicyId ? agentPolicyRouteService.getInfoPath(agentPolicyId) : undefined,
    method: 'get',
    shouldSendRequest: !!agentPolicyId,
    version: API_VERSIONS.public.v1,
  } as SendConditionalRequestConfig);
};

export const useGetOneAgentPolicyFull = (agentPolicyId: string) => {
  return useRequest<GetFullAgentPolicyResponse>({
    path: agentPolicyRouteService.getInfoFullPath(agentPolicyId),
    method: 'get',
    version: API_VERSIONS.public.v1,
  });
};

export const sendGetOneAgentPolicyFull = (
  agentPolicyId: string,
  query: { standalone?: boolean; kubernetes?: boolean } = {}
) => {
  return sendRequest<GetFullAgentPolicyResponse>({
    path: agentPolicyRouteService.getInfoFullPath(agentPolicyId),
    method: 'get',
    query,
    version: API_VERSIONS.public.v1,
  });
};

export const sendGetOneAgentPolicy = (agentPolicyId: string) => {
  return sendRequest<GetOneAgentPolicyResponse>({
    path: agentPolicyRouteService.getInfoPath(agentPolicyId),
    method: 'get',
    version: API_VERSIONS.public.v1,
  });
};

export const sendCreateAgentPolicy = (
  body: CreateAgentPolicyRequest['body'],
  { withSysMonitoring }: { withSysMonitoring: boolean } = { withSysMonitoring: false }
) => {
  return sendRequest<CreateAgentPolicyResponse>({
    path: agentPolicyRouteService.getCreatePath(),
    method: 'post',
    body: JSON.stringify(body),
    query: withSysMonitoring ? { sys_monitoring: true } : {},
    version: API_VERSIONS.public.v1,
  });
};

export const sendUpdateAgentPolicy = (
  agentPolicyId: string,
  body: UpdateAgentPolicyRequest['body']
) => {
  return sendRequest<UpdateAgentPolicyResponse>({
    path: agentPolicyRouteService.getUpdatePath(agentPolicyId),
    method: 'put',
    body: JSON.stringify(body),
    version: API_VERSIONS.public.v1,
  });
};

export const sendCopyAgentPolicy = (
  agentPolicyId: string,
  body: CopyAgentPolicyRequest['body']
) => {
  return sendRequest<CopyAgentPolicyResponse>({
    path: agentPolicyRouteService.getCopyPath(agentPolicyId),
    method: 'post',
    body: JSON.stringify(body),
  });
};

export function useDeleteAgentPolicyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function sendDeleteAgentPolicy(body: DeleteAgentPolicyRequest['body']) {
      return sendRequest<DeleteAgentPolicyResponse>({
        path: agentPolicyRouteService.getDeletePath(),
        method: 'post',
        body: JSON.stringify(body),
        version: API_VERSIONS.public.v1,
      });
    },
    onSuccess: () => {
      return queryClient.invalidateQueries(['agentPolicies']);
    },
  });
}

export const sendResetOnePreconfiguredAgentPolicy = (agentPolicyId: string) => {
  return sendRequest({
    path: agentPolicyRouteService.getResetOnePreconfiguredAgentPolicyPath(agentPolicyId),
    method: 'post',
    body: JSON.stringify({}),
    version: API_VERSIONS.internal.v1,
  });
};

export const sendResetAllPreconfiguredAgentPolicies = () => {
  return sendRequest({
    path: agentPolicyRouteService.getResetAllPreconfiguredAgentPolicyPath(),
    method: 'post',
    body: JSON.stringify({}),
    version: API_VERSIONS.internal.v1,
  });
};
