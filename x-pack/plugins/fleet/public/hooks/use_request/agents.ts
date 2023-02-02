/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
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

import { agentRouteService } from '../../services';

import type {
  GetOneAgentResponse,
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

export function sendGetAgents(query: GetAgentsRequest['query'], options?: RequestOptions) {
  return sendRequest<GetAgentsResponse>({
    method: 'get',
    path: agentRouteService.getListPath(),
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
export function sendGetAgentIncomingData(query: GetAgentIncomingDataRequest['query']) {
  return sendRequest<GetAgentIncomingDataResponse>({
    method: 'get',
    path: agentRouteService.getIncomingDataPath(),
    query,
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

export function sendGetAgentTags(query: GetAgentsRequest['query'], options?: RequestOptions) {
  return sendRequest<GetAgentTagsResponse>({
    method: 'get',
    path: agentRouteService.getListTagsPath(),
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

export function sendPostRequestDiagnostics(agentId: string, options?: RequestOptions) {
  return sendRequest<PostRequestDiagnosticsResponse>({
    path: agentRouteService.getRequestDiagnosticsPath(agentId),
    method: 'post',
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
    ...options,
  });
}

export function sendGetAgentUploads(agentId: string, options?: RequestOptions) {
  return sendRequest<GetAgentUploadsResponse>({
    path: agentRouteService.getListAgentUploads(agentId),
    method: 'get',
    ...options,
  });
}

export const useGetAgentUploads = (agentId: string, options?: RequestOptions) => {
  return useRequest<GetAgentUploadsResponse>({
    path: agentRouteService.getListAgentUploads(agentId),
    method: 'get',
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

export function sendGetActionStatus() {
  return sendRequest<GetActionStatusResponse>({
    path: agentRouteService.getActionStatusPath(),
    method: 'get',
  });
}

export function sendPostCancelAction(actionId: string) {
  return sendRequest<GetCurrentUpgradesResponse>({
    path: agentRouteService.getCancelActionPath(actionId),
    method: 'post',
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
    ...options,
  });
}

export function sendGetAgentsAvailableVersions() {
  return sendRequest<GetAvailableVersionsResponse>({
    method: 'get',
    path: agentRouteService.getAvailableVersionsPath(),
  });
}
