/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeOf } from '@kbn/config-schema';
import { HttpFetchQuery } from 'kibana/public';
import { useRequest, sendRequest } from './use_request';
import { agentConfigRouteService } from '../../services';
import {
  GetAgentConfigsResponse,
  CreateAgentConfigRequestSchema,
  CreateAgentConfigResponse,
} from '../../types';

export const useGetAgentConfigs = (query: HttpFetchQuery = {}) => {
  return useRequest<GetAgentConfigsResponse>({
    path: agentConfigRouteService.getListPath(),
    method: 'get',
    query,
  });
};

export const sendCreateAgentConfig = (body: TypeOf<typeof CreateAgentConfigRequestSchema.body>) => {
  return sendRequest<CreateAgentConfigResponse>({
    path: agentConfigRouteService.getCreatePath(),
    method: 'post',
    body: JSON.stringify(body),
  });
};
