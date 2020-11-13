/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useRequest, UseRequestConfig, sendRequest } from './use_request';
import { agentRouteService } from '../../services';
import {
  GetOneAgentResponse,
  GetOneAgentEventsResponse,
  GetOneAgentEventsRequest,
  PostAgentUnenrollRequest,
  PostBulkAgentUnenrollRequest,
  PostBulkAgentUnenrollResponse,
  PostAgentUnenrollResponse,
  PutAgentReassignRequest,
  PutAgentReassignResponse,
  PostBulkAgentReassignRequest,
  PostBulkAgentReassignResponse,
  GetAgentsRequest,
  GetAgentsResponse,
  GetAgentStatusRequest,
  GetAgentStatusResponse,
  PostAgentUpgradeRequest,
  PostBulkAgentUpgradeRequest,
  PostAgentUpgradeResponse,
  PostBulkAgentUpgradeResponse,
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
  query: GetOneAgentEventsRequest['query'],
  options?: RequestOptions
) {
  return useRequest<GetOneAgentEventsResponse>({
    path: agentRouteService.getEventsPath(agentId),
    method: 'get',
    query,
    ...options,
  });
}

export function useGetAgents(query: GetAgentsRequest['query'], options?: RequestOptions) {
  return useRequest<GetAgentsResponse>({
    method: 'get',
    path: agentRouteService.getListPath(),
    query,
    ...options,
  });
}

export function sendGetAgentStatus(
  query: GetAgentStatusRequest['query'],
  options?: RequestOptions
) {
  return sendRequest<GetAgentStatusResponse>({
    method: 'get',
    path: agentRouteService.getStatusPath(),
    query,
    ...options,
  });
}

export function useGetAgentStatus(query: GetAgentStatusRequest['query'], options?: RequestOptions) {
  return useRequest<GetAgentStatusResponse>({
    method: 'get',
    path: agentRouteService.getStatusPath(),
    query,
    ...options,
  });
}

export function sendPutAgentReassign(
  agentId: string,
  body: PutAgentReassignRequest['body'],
  options?: RequestOptions
) {
  return sendRequest<PutAgentReassignResponse>({
    method: 'put',
    path: agentRouteService.getReassignPath(agentId),
    body,
    ...options,
  });
}

export function sendPostBulkAgentReassign(
  body: PostBulkAgentReassignRequest['body'],
  options?: RequestOptions
) {
  return sendRequest<PostBulkAgentReassignResponse>({
    method: 'post',
    path: agentRouteService.getBulkReassignPath(),
    body,
    ...options,
  });
}

export function sendPostAgentUnenroll(
  agentId: string,
  body: PostAgentUnenrollRequest['body'],
  options?: RequestOptions
) {
  return sendRequest<PostAgentUnenrollResponse>({
    path: agentRouteService.getUnenrollPath(agentId),
    method: 'post',
    body,
    ...options,
  });
}

export function sendPostBulkAgentUnenroll(
  body: PostBulkAgentUnenrollRequest['body'],
  options?: RequestOptions
) {
  return sendRequest<PostBulkAgentUnenrollResponse>({
    path: agentRouteService.getBulkUnenrollPath(),
    method: 'post',
    body,
    ...options,
  });
}

export function sendPostAgentUpgrade(
  agentId: string,
  body: PostAgentUpgradeRequest['body'],
  options?: RequestOptions
) {
  return sendRequest<PostAgentUpgradeResponse>({
    path: agentRouteService.getUpgradePath(agentId),
    method: 'post',
    body,
    ...options,
  });
}

export function sendPostBulkAgentUpgrade(
  body: PostBulkAgentUpgradeRequest['body'],
  options?: RequestOptions
) {
  return sendRequest<PostBulkAgentUpgradeResponse>({
    path: agentRouteService.getBulkUpgradePath(),
    method: 'post',
    body,
    ...options,
  });
}
