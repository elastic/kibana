/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@kbn/es-types';

import type {
  Agent,
  AgentAction,
  ActionStatus,
  CurrentUpgrade,
  NewAgentAction,
  AgentDiagnostics,
  AgentStatus,
} from '../models';

import type { ListResult, ListWithKuery } from './common';

export interface GetAgentsRequest {
  query: ListWithKuery & {
    showInactive: boolean;
    showUpgradeable?: boolean;
    withMetrics?: boolean;
  };
}

export interface GetAgentsResponse extends ListResult<Agent> {
  // deprecated in 8.x
  list?: Agent[];
  statusSummary?: Record<AgentStatus, number>;
}

export interface GetAgentTagsResponse {
  items: string[];
}

export interface GetOneAgentRequest {
  params: {
    agentId: string;
  };
  query: {
    withMetrics?: boolean;
  };
}

export interface GetOneAgentResponse {
  item: Agent;
}

export interface GetAgentUploadsResponse {
  items: AgentDiagnostics[];
}

export interface DeleteAgentUploadResponse {
  id: string;
  deleted: boolean;
}

export interface PostNewAgentActionRequest {
  body: {
    action: Omit<NewAgentAction, 'agents'>;
  };
  params: {
    agentId: string;
  };
}

export interface PostNewAgentActionResponse {
  item: AgentAction;
}

export interface PostAgentUnenrollRequest {
  params: {
    agentId: string;
  };
  body: {
    force?: boolean;
    revoke?: boolean;
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PostAgentUnenrollResponse {}

export interface PostBulkAgentUnenrollRequest {
  body: {
    agents: string[] | string;
    force?: boolean;
    revoke?: boolean;
    includeInactive?: boolean;
  };
}

export interface BulkAgentAction {
  actionId: string;
}

export type PostBulkAgentUnenrollResponse = BulkAgentAction;

export interface PostAgentUpgradeRequest {
  params: {
    agentId: string;
  };
  body: {
    source_uri?: string;
    version: string;
    force?: boolean;
  };
}

export interface PostBulkAgentUpgradeRequest {
  body: {
    agents: string[] | string;
    source_uri?: string;
    version: string;
    rollout_duration_seconds?: number;
    start_time?: string;
    force?: boolean;
    includeInactive?: boolean;
  };
}

export type PostBulkAgentUpgradeResponse = BulkAgentAction;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PostAgentUpgradeResponse {}

// deprecated
export interface PutAgentReassignRequest {
  params: {
    agentId: string;
  };
  body: { policy_id: string };
}
// deprecated
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PutAgentReassignResponse {}
export interface PostAgentReassignRequest {
  params: {
    agentId: string;
  };
  body: { policy_id: string };
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PostAgentReassignResponse {}

export interface PostBulkAgentReassignRequest {
  body: {
    policy_id: string;
    agents: string[] | string;
    batchSize?: number;
    includeInactive?: boolean;
  };
}

export enum RequestDiagnosticsAdditionalMetrics {
  'CPU' = 'CPU',
}

export interface PostRequestDiagnosticsRequest {
  body: {
    additional_metrics: RequestDiagnosticsAdditionalMetrics[];
  };
}

export type PostRequestDiagnosticsResponse = BulkAgentAction;
export type PostBulkRequestDiagnosticsResponse = BulkAgentAction;

export interface PostRequestBulkDiagnosticsRequest {
  body: {
    agents: string[] | string;
    batchSize?: number;
    additional_metrics: RequestDiagnosticsAdditionalMetrics[];
  };
}

export type PostBulkAgentReassignResponse = BulkAgentAction;

export type PostBulkUpdateAgentTagsResponse = BulkAgentAction;

export interface DeleteAgentRequest {
  params: {
    agentId: string;
  };
}

export interface UpdateAgentRequest {
  params: {
    agentId: string;
  };
  body: {
    user_provided_metadata?: Record<string, any>;
    tags?: string[];
  };
}

export interface PostBulkUpdateAgentTagsRequest {
  body: {
    agents: string[] | string;
    tagsToAdd?: string[];
    tagsToRemove?: string[];
    includeInactive?: boolean;
  };
}

export interface GetAgentStatusRequest {
  query: {
    kuery?: string;
    policyId?: string;
  };
}

export interface GetAgentStatusResponse {
  results: {
    events: number;
    // deprecated
    total: number;
    online: number;
    error: number;
    offline: number;
    other: number;
    updating: number;
    inactive: number;
    unenrolled: number;
    all: number;
    active: number;
  };
}

export interface GetAgentIncomingDataRequest {
  query: {
    agentsIds: string[];
    pkgName?: string;
    pkgVersion?: string;
    previewData?: boolean;
  };
}

export interface IncomingDataList {
  [key: string]: { data: boolean };
}
export interface GetAgentIncomingDataResponse {
  items: IncomingDataList[];
  dataPreview: SearchHit[];
}

export interface GetCurrentUpgradesResponse {
  items: CurrentUpgrade[];
}

export interface GetActionStatusRequest {
  query: {
    perPage?: number;
    page?: number;
    date?: string;
    latest?: number;
  };
}
export interface GetActionStatusResponse {
  items: ActionStatus[];
}
export interface GetAvailableVersionsResponse {
  items: string[];
}

export interface PostRetrieveAgentsByActionsRequest {
  body: {
    actionIds: string[];
  };
}

export interface PostRetrieveAgentsByActionsResponse {
  items: string[];
}
