/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';

import type {
  GetActionStatusRequest,
  GetActionStatusResponse,
  GetAgentTagsResponse,
  GetAgentUploadsResponse,
  GetOneAgentRequest,
  PostBulkRequestDiagnosticsResponse,
  PostBulkUpdateAgentTagsRequest,
  PostRequestBulkDiagnosticsRequest,
  PostRequestDiagnosticsResponse,
  UpdateAgentRequest,
} from '../../../common/types';

import { API_VERSIONS } from '../../../common/constants';

import { agentRouteService } from '../../services';

import type {
  GetOneAgentResponse,
  PostAgentUnenrollRequest,
  PostBulkAgentUnenrollRequest,
  PostBulkAgentUnenrollResponse,
  PostAgentUnenrollResponse,
  PostAgentReassignRequest,
  PostAgentReassignResponse,
  PostBulkAgentReassignRequest,
  PostBulkAgentReassignResponse,
  GetAgentsRequest,
  GetAgentsResponse,
  GetAgentStatusRequest,
  GetAgentStatusResponse,
  GetAgentIncomingDataRequest,
  GetAgentIncomingDataResponse,
  PostAgentUpgradeRequest,
  PostBulkAgentUpgradeRequest,
  PostAgentUpgradeResponse,
  PostBulkAgentUpgradeResponse,
  PostNewAgentActionRequest,
  PostNewAgentActionResponse,
  GetCurrentUpgradesResponse,
  GetAvailableVersionsResponse,
  PostRetrieveAgentsByActionsRequest,
  PostRetrieveAgentsByActionsResponse,
} from '../../types';

import { useRequest, sendRequest } from './use_request';
import type { UseRequestConfig } from './use_request';

type RequestOptions = Pick<Partial<UseRequestConfig>, 'pollIntervalMs'>;

export function useGetOneAgent(
  agentId: string,
  options?: RequestOptions & {
    query?: GetOneAgentRequest['query'];
  }
) {
  return useRequest<GetOneAgentResponse>({
    path: agentRouteService.getInfoPath(agentId),
    method: 'get',
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function useGetAgents(query: GetAgentsRequest['query'], options?: RequestOptions) {
  return useRequest<GetAgentsResponse>({
    method: 'get',
    path: agentRouteService.getListPath(),
    version: API_VERSIONS.public.v1,
    query,
    ...options,
  });
}
export function useGetAgentsQuery(
  query: GetAgentsRequest['query'],
  options: Partial<{ enabled: boolean }> = {}
) {
  return useQuery(['agents', query], () => sendGetAgents(query), {
    enabled: options.enabled,
  });
}

export function sendGetAgents(query: GetAgentsRequest['query'], options?: RequestOptions) {
  return sendRequest<GetAgentsResponse>({
    method: 'get',
    path: agentRouteService.getListPath(),
    version: API_VERSIONS.public.v1,
    query,
    ...options,
  });
}

export function useGetAgentStatus(query: GetAgentStatusRequest['query'], options?: RequestOptions) {
  return useRequest<GetAgentStatusResponse>({
    method: 'get',
    path: agentRouteService.getStatusPath(),
    version: API_VERSIONS.public.v1,
    query,
    ...options,
  });
}
export function sendGetAgentIncomingData(query: GetAgentIncomingDataRequest['query']) {
  return sendRequest<GetAgentIncomingDataResponse>({
    method: 'get',
    path: agentRouteService.getIncomingDataPath(),
    query,
    version: API_VERSIONS.public.v1,
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
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function sendGetAgentTags(query: GetAgentsRequest['query'], options?: RequestOptions) {
  return sendRequest<GetAgentTagsResponse>({
    method: 'get',
    path: agentRouteService.getListTagsPath(),
    query,
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function sendPostAgentReassign(
  agentId: string,
  body: PostAgentReassignRequest['body'],
  options?: RequestOptions
) {
  return sendRequest<PostAgentReassignResponse>({
    method: 'post',
    path: agentRouteService.getReassignPath(agentId),
    body,
    version: API_VERSIONS.public.v1,
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
    version: API_VERSIONS.public.v1,
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
    version: API_VERSIONS.public.v1,
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
    version: API_VERSIONS.public.v1,
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
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function sendPostRequestDiagnostics(agentId: string, options?: RequestOptions) {
  return sendRequest<PostRequestDiagnosticsResponse>({
    path: agentRouteService.getRequestDiagnosticsPath(agentId),
    method: 'post',
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function sendPostBulkRequestDiagnostics(
  body: PostRequestBulkDiagnosticsRequest['body'],
  options?: RequestOptions
) {
  return sendRequest<PostBulkRequestDiagnosticsResponse>({
    path: agentRouteService.getBulkRequestDiagnosticsPath(),
    method: 'post',
    body,
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function sendGetAgentUploads(agentId: string, options?: RequestOptions) {
  return sendRequest<GetAgentUploadsResponse>({
    path: agentRouteService.getListAgentUploads(agentId),
    method: 'get',
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export const useGetAgentUploads = (agentId: string, options?: RequestOptions) => {
  return useRequest<GetAgentUploadsResponse>({
    path: agentRouteService.getListAgentUploads(agentId),
    method: 'get',
    version: API_VERSIONS.public.v1,
    ...options,
  });
};

export function sendPostAgentAction(
  agentId: string,
  body: PostNewAgentActionRequest['body'],
  options?: RequestOptions
) {
  return sendRequest<PostNewAgentActionResponse>({
    path: agentRouteService.getCreateActionPath(agentId),
    method: 'post',
    body,
    version: API_VERSIONS.public.v1,
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
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function sendGetActionStatus(query: GetActionStatusRequest['query'] = {}) {
  return sendRequest<GetActionStatusResponse>({
    path: agentRouteService.getActionStatusPath(),
    method: 'get',
    version: API_VERSIONS.public.v1,
    query,
  });
}

export function sendPostCancelAction(actionId: string) {
  return sendRequest<GetCurrentUpgradesResponse>({
    path: agentRouteService.getCancelActionPath(actionId),
    method: 'post',
    version: API_VERSIONS.public.v1,
  });
}

export function sendPostRetrieveAgentsByActions(body: PostRetrieveAgentsByActionsRequest['body']) {
  return sendRequest<PostRetrieveAgentsByActionsResponse>({
    path: agentRouteService.getAgentsByActionsPath(),
    method: 'post',
    version: API_VERSIONS.public.v1,
    body,
  });
}

export function sendPutAgentTagsUpdate(
  agentId: string,
  body: UpdateAgentRequest['body'],
  options?: RequestOptions
) {
  return sendRequest<GetOneAgentResponse>({
    method: 'put',
    path: agentRouteService.getUpdatePath(agentId),
    body,
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function sendPostBulkAgentTagsUpdate(
  body: PostBulkUpdateAgentTagsRequest['body'],
  options?: RequestOptions
) {
  return sendRequest<GetOneAgentResponse>({
    method: 'post',
    path: agentRouteService.getBulkUpdateTagsPath(),
    body,
    version: API_VERSIONS.public.v1,
    ...options,
  });
}

export function sendGetAgentsAvailableVersions() {
  return sendRequest<GetAvailableVersionsResponse>({
    method: 'get',
    path: agentRouteService.getAvailableVersionsPath(),
    version: API_VERSIONS.public.v1,
  });
}
