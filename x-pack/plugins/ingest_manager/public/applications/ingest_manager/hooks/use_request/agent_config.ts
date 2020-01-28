/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpFetchQuery } from 'kibana/public';
import { useRequest } from './use_request';
import { agentConfigRouteService } from '../../services';
import { GetAgentConfigsResponse } from '../../types';

export const useGetAgentConfigs = (query: HttpFetchQuery = {}) => {
  return useRequest<GetAgentConfigsResponse>({
    path: agentConfigRouteService.getListPath(),
    method: 'get',
    query,
  });
};
