/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpFetchQuery } from 'src/core/public';
import {
  useRequest,
  sendRequest,
  useConditionalRequest,
  SendConditionalRequestConfig,
} from './use_request';
import { agentConfigRouteService } from '../../services';
import {
  GetAgentConfigsResponse,
  GetOneAgentConfigResponse,
  CreateAgentConfigRequest,
  CreateAgentConfigResponse,
  UpdateAgentConfigRequest,
  UpdateAgentConfigResponse,
  DeleteAgentConfigRequest,
  DeleteAgentConfigResponse,
} from '../../types';

export const useGetAgentConfigs = (query: HttpFetchQuery = {}) => {
  return useRequest<GetAgentConfigsResponse>({
    path: agentConfigRouteService.getListPath(),
    method: 'get',
    query,
  });
};

export const useGetOneAgentConfig = (agentConfigId: string | undefined) => {
  return useConditionalRequest<GetOneAgentConfigResponse>({
    path: agentConfigId ? agentConfigRouteService.getInfoPath(agentConfigId) : undefined,
    method: 'get',
    shouldSendRequest: !!agentConfigId,
  } as SendConditionalRequestConfig);
};

export const useGetOneAgentConfigFull = (agentConfigId: string) => {
  return useRequest({
    path: agentConfigRouteService.getInfoFullPath(agentConfigId),
    method: 'get',
  });
};

export const sendGetOneAgentConfig = (agentConfigId: string) => {
  return sendRequest<GetOneAgentConfigResponse>({
    path: agentConfigRouteService.getInfoPath(agentConfigId),
    method: 'get',
  });
};

export const sendCreateAgentConfig = (
  body: CreateAgentConfigRequest['body'],
  { withSysMonitoring }: { withSysMonitoring: boolean } = { withSysMonitoring: false }
) => {
  return sendRequest<CreateAgentConfigResponse>({
    path: agentConfigRouteService.getCreatePath(),
    method: 'post',
    body: JSON.stringify(body),
    query: withSysMonitoring ? { sys_monitoring: true } : {},
  });
};

export const sendUpdateAgentConfig = (
  agentConfigId: string,
  body: UpdateAgentConfigRequest['body']
) => {
  return sendRequest<UpdateAgentConfigResponse>({
    path: agentConfigRouteService.getUpdatePath(agentConfigId),
    method: 'put',
    body: JSON.stringify(body),
  });
};

export const sendDeleteAgentConfig = (body: DeleteAgentConfigRequest['body']) => {
  return sendRequest<DeleteAgentConfigResponse>({
    path: agentConfigRouteService.getDeletePath(),
    method: 'post',
    body: JSON.stringify(body),
  });
};
