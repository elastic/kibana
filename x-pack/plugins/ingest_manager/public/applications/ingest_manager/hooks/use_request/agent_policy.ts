/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  useRequest,
  sendRequest,
  useConditionalRequest,
  SendConditionalRequestConfig,
} from './use_request';
import { agentPolicyRouteService } from '../../services';
import {
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
} from '../../types';

export const useGetAgentPolicies = (query?: GetAgentPoliciesRequest['query']) => {
  return useRequest<GetAgentPoliciesResponse>({
    path: agentPolicyRouteService.getListPath(),
    method: 'get',
    query,
  });
};

export const useGetOneAgentPolicy = (agentPolicyId: string | undefined) => {
  return useConditionalRequest<GetOneAgentPolicyResponse>({
    path: agentPolicyId ? agentPolicyRouteService.getInfoPath(agentPolicyId) : undefined,
    method: 'get',
    shouldSendRequest: !!agentPolicyId,
  } as SendConditionalRequestConfig);
};

export const useGetOneAgentPolicyFull = (agentPolicyId: string) => {
  return useRequest<GetFullAgentPolicyResponse>({
    path: agentPolicyRouteService.getInfoFullPath(agentPolicyId),
    method: 'get',
  });
};

export const sendGetOneAgentPolicyFull = (
  agentPolicyId: string,
  query: { standalone?: boolean } = {}
) => {
  return sendRequest<GetFullAgentPolicyResponse>({
    path: agentPolicyRouteService.getInfoFullPath(agentPolicyId),
    method: 'get',
    query,
  });
};

export const sendGetOneAgentPolicy = (agentPolicyId: string) => {
  return sendRequest<GetOneAgentPolicyResponse>({
    path: agentPolicyRouteService.getInfoPath(agentPolicyId),
    method: 'get',
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

export const sendDeleteAgentPolicy = (body: DeleteAgentPolicyRequest['body']) => {
  return sendRequest<DeleteAgentPolicyResponse>({
    path: agentPolicyRouteService.getDeletePath(),
    method: 'post',
    body: JSON.stringify(body),
  });
};
