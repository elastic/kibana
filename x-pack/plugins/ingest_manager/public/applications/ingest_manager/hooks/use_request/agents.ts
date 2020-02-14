/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';
import { useRequest, UseRequestConfig } from './use_request';
import { agentRouteService } from '../../services';
import {
  GetOneAgentResponse,
  GetOneAgentEventsResponse,
  GetOneAgentEventsRequestSchema,
  GetAgentsRequestSchema,
  GetAgentsResponse,
} from '../../types';

type RequestOptions = Pick<Partial<UseRequestConfig>, 'pollIntervalMs'>;

export function useGetOneAgent(agentId: string, options?: RequestOptions) {
  return useRequest<GetOneAgentResponse>({
    path: agentRouteService.getInfoPath(agentId),
    method: 'get',
    ...options,
  });
}

export function useGetOneAgentEvents(
  agentId: string,
  query: TypeOf<typeof GetOneAgentEventsRequestSchema.query>,
  options?: RequestOptions
) {
  return useRequest<GetOneAgentEventsResponse>({
    path: agentRouteService.getEventsPath(agentId),
    method: 'get',
    query,
    ...options,
  });
}

export function useGetAgents(
  query: TypeOf<typeof GetAgentsRequestSchema.query>,
  options?: RequestOptions
) {
  return useRequest<GetAgentsResponse>({
    method: 'get',
    path: agentRouteService.getListPath(),
    query,
    ...options,
  });
}
