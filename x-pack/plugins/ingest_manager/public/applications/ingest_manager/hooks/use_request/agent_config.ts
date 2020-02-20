/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpFetchQuery } from 'kibana/public';
import { useRequest, sendRequest } from './use_request';
import { agentConfigRouteService } from '../../services';
import {
  GetAgentConfigsResponse,
  GetOneAgentConfigResponse,
  CreateAgentConfigRequestSchema,
  CreateAgentConfigResponse,
  UpdateAgentConfigRequestSchema,
  UpdateAgentConfigResponse,
  DeleteAgentConfigsRequestSchema,
  DeleteAgentConfigsResponse,
} from '../../types';

export const useGetAgentConfigs = (query: HttpFetchQuery = {}) => {
  return useRequest<GetAgentConfigsResponse>({
    path: agentConfigRouteService.getListPath(),
    method: 'get',
    query,
  });
};

export const useGetOneAgentConfig = (agentConfigId: string) => {
  return useRequest<GetOneAgentConfigResponse>({
    path: agentConfigRouteService.getInfoPath(agentConfigId),
    method: 'get',
  });
};

export const sendCreateAgentConfig = (body: CreateAgentConfigRequestSchema['body']) => {
  return sendRequest<CreateAgentConfigResponse>({
    path: agentConfigRouteService.getCreatePath(),
    method: 'post',
    body: JSON.stringify(body),
  });
};

export const sendUpdateAgentConfig = (
  agentConfigId: string,
  body: UpdateAgentConfigRequestSchema['body']
) => {
  return sendRequest<UpdateAgentConfigResponse>({
    path: agentConfigRouteService.getUpdatePath(agentConfigId),
    method: 'put',
    body: JSON.stringify(body),
  });
};

export const sendDeleteAgentConfigs = (body: DeleteAgentConfigsRequestSchema['body']) => {
  return sendRequest<DeleteAgentConfigsResponse>({
    path: agentConfigRouteService.getDeletePath(),
    method: 'post',
    body: JSON.stringify(body),
  });
};
